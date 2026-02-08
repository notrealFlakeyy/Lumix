import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type CreateInvoicePayload = {
  clientName: string
  clientEmail: string
  amount: number
  dueDate?: string | null
  notes?: string
}

const buildInvoiceNumber = (): string => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${stamp}-${rand}`
}

const formatAmount = (amount: number): string => {
  if (!Number.isFinite(amount)) {
    return '$0.00'
  }
  return `$${amount.toFixed(2)}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return res.status(403).json({ message: 'You do not have permission to create invoices.' })
  }

  const payload = req.body as CreateInvoicePayload
  if (!payload?.clientName || !payload?.clientEmail || !payload?.amount) {
    return res.status(400).json({ message: 'Missing required fields.' })
  }

  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0.' })
  }

  const invoiceNumber = buildInvoiceNumber()
  const dueDateValue = payload.dueDate ? new Date(payload.dueDate) : null

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      company_id: profile.company_id,
      client: payload.clientName,
      invoice_number: invoiceNumber,
      due_date: dueDateValue ? dueDateValue.toISOString().slice(0, 10) : null,
      amount,
      status: 'pending',
    })
    .select('id')
    .single()

  if (invoiceError) {
    return res.status(500).json({ message: 'Could not save invoice.' })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM || 'Lumix <onboarding@resend.dev>'

  if (!resendApiKey) {
    return res.status(500).json({ message: 'Missing RESEND_API_KEY.' })
  }

  const dueDateLabel = payload.dueDate ? new Date(payload.dueDate).toLocaleDateString() : 'No due date'
  const senderName = profile.full_name || 'Lumix'

  const emailPayload = {
    from: resendFrom,
    to: [payload.clientEmail],
    subject: `Invoice ${invoiceNumber} from ${senderName}`,
    text: `Hi ${payload.clientName},\n\nAn invoice has been created for ${formatAmount(amount)}.\nDue date: ${dueDateLabel}\n\n${payload.notes ? `Notes: ${payload.notes}\n\n` : ''}Thanks,\n${senderName}`,
    html: `
      <p>Hi ${payload.clientName},</p>
      <p>An invoice has been created for <strong>${formatAmount(amount)}</strong>.</p>
      <p>Due date: ${dueDateLabel}</p>
      ${payload.notes ? `<p>Notes: ${payload.notes}</p>` : ''}
      <p>Thanks,<br />${senderName}</p>
    `,
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  if (!resendResponse.ok) {
    const errorPayload = await resendResponse.json().catch(() => null)
    return res.status(502).json({
      message: errorPayload?.message ?? 'Email delivery failed.',
      invoiceId: invoice.id,
    })
  }

  return res.status(200).json({ invoiceId: invoice.id })
}
