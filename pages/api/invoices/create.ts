import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import PDFDocument from 'pdfkit'

type CreateInvoicePayload = {
  clientId?: string | null
  clientName?: string
  clientEmail?: string
  saveClient?: boolean
  currency?: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    discountRate: number
  }>
  dueDate?: string | null
  notes?: string
}

const buildInvoiceNumber = (): string => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${stamp}-${rand}`
}

const formatAmount = (amount: number, currency: string): string => {
  if (!Number.isFinite(amount)) {
    return '0.00'
  }
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : ''
  return `${symbol}${amount.toFixed(2)}`
}

const generateInvoicePdf = async (payload: {
  invoiceNumber: string
  clientName: string
  clientEmail: string
  dueDateLabel: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxRate: number
    discountRate: number
    lineTotal: number
  }>
  subtotal: number
  taxTotal: number
  discountTotal: number
  total: number
  currency: string
  notes?: string
  senderName: string
}) => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const buffers: Buffer[] = []
    doc.on('data', (data) => buffers.push(data))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    doc.fontSize(18).text('Invoice', { align: 'left' })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`Invoice #${payload.invoiceNumber}`)
    doc.text(`Due date: ${payload.dueDateLabel}`)
    doc.moveDown(0.5)
    doc.text(`Bill to: ${payload.clientName}`)
    if (payload.clientEmail) {
      doc.text(payload.clientEmail)
    }

    doc.moveDown(1)
    doc.fontSize(11).text('Items')
    doc.moveDown(0.4)

    const startY = doc.y
    doc.fontSize(10)
    doc.text('Description', 50, startY)
    doc.text('Qty', 280, startY, { width: 40, align: 'right' })
    doc.text('Unit', 330, startY, { width: 60, align: 'right' })
    doc.text('Tax', 400, startY, { width: 50, align: 'right' })
    doc.text('Disc', 450, startY, { width: 50, align: 'right' })
    doc.text('Total', 510, startY, { width: 60, align: 'right' })

    let rowY = startY + 16
    payload.items.forEach((item) => {
      doc.text(item.description, 50, rowY, { width: 220 })
      doc.text(String(item.quantity), 280, rowY, { width: 40, align: 'right' })
      doc.text(formatAmount(item.unitPrice, payload.currency), 330, rowY, { width: 60, align: 'right' })
      doc.text(`${item.taxRate.toFixed(2)}%`, 400, rowY, { width: 50, align: 'right' })
      doc.text(`${item.discountRate.toFixed(2)}%`, 450, rowY, { width: 50, align: 'right' })
      doc.text(formatAmount(item.lineTotal, payload.currency), 510, rowY, { width: 60, align: 'right' })
      rowY += 18
    })

    doc.moveDown(2)
    doc.text(`Subtotal: ${formatAmount(payload.subtotal, payload.currency)}`, { align: 'right' })
    doc.text(`Discounts: -${formatAmount(payload.discountTotal, payload.currency)}`, { align: 'right' })
    doc.text(`Tax: ${formatAmount(payload.taxTotal, payload.currency)}`, { align: 'right' })
    doc.fontSize(12).text(`Total: ${formatAmount(payload.total, payload.currency)}`, { align: 'right' })

    if (payload.notes) {
      doc.moveDown(1)
      doc.fontSize(10).text(`Notes: ${payload.notes}`)
    }

    doc.moveDown(1)
    doc.fontSize(10).text(`Sent by ${payload.senderName}`, { align: 'left' })
    doc.end()
  })
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
  if (!payload?.items?.length) {
    return res.status(400).json({ message: 'Invoice must include at least one line item.' })
  }

  const currency = payload.currency || 'EUR'
  let clientName = payload.clientName?.trim() || ''
  let clientEmail = payload.clientEmail?.trim() || ''
  let clientId = payload.clientId ?? null

  if (clientId) {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('id', clientId)
      .single()
    if (clientError || !client) {
      return res.status(400).json({ message: 'Selected client could not be found.' })
    }
    clientName = client.name
    clientEmail = client.email ?? clientEmail
  }

  if (!clientName) {
    return res.status(400).json({ message: 'Client name is required.' })
  }

  if (!clientEmail) {
    return res.status(400).json({ message: 'Client email is required.' })
  }

  const invoiceNumber = buildInvoiceNumber()
  const dueDateValue = payload.dueDate ? new Date(payload.dueDate) : null
  const items = payload.items.map((item) => ({
    description: item.description?.trim() || '',
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxRate: Number(item.taxRate),
    discountRate: Number(item.discountRate),
  }))

  if (items.some((item) => !item.description || item.quantity <= 0 || !Number.isFinite(item.unitPrice))) {
    return res.status(400).json({ message: 'Invalid line item details.' })
  }

  const lineItems = items.map((item) => {
    const lineSubtotal = item.quantity * item.unitPrice
    const discount = lineSubtotal * (item.discountRate / 100)
    const taxable = lineSubtotal - discount
    const tax = taxable * (item.taxRate / 100)
    const lineTotal = taxable + tax
    return { ...item, lineTotal, lineSubtotal, discount, tax }
  })

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineSubtotal, 0)
  const discountTotal = lineItems.reduce((sum, item) => sum + item.discount, 0)
  const taxTotal = lineItems.reduce((sum, item) => sum + item.tax, 0)
  const total = subtotal - discountTotal + taxTotal

  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ message: 'Invoice total must be greater than 0.' })
  }

  if (payload.saveClient && !clientId) {
    const { data: createdClient, error: createClientError } = await supabase
      .from('clients')
      .insert({
        company_id: profile.company_id,
        name: clientName,
        email: clientEmail,
      })
      .select('id')
      .single()
    if (!createClientError && createdClient) {
      clientId = createdClient.id
    }
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      company_id: profile.company_id,
      client_id: clientId,
      client: clientName,
      client_email: clientEmail,
      invoice_number: invoiceNumber,
      due_date: dueDateValue ? dueDateValue.toISOString().slice(0, 10) : null,
      subtotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      amount: total,
      currency,
      status: 'pending',
    })
    .select('id')
    .single()

  if (invoiceError) {
    return res.status(500).json({ message: 'Could not save invoice.' })
  }

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(
      lineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        discount_rate: item.discountRate,
        line_total: item.lineTotal,
      })),
    )

  if (itemsError) {
    return res.status(500).json({ message: 'Could not save invoice items.' })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM || 'Lumix <onboarding@resend.dev>'

  if (!resendApiKey) {
    return res.status(500).json({ message: 'Missing RESEND_API_KEY.' })
  }

  const dueDateLabel = payload.dueDate ? new Date(payload.dueDate).toLocaleDateString() : 'No due date'
  const senderName = profile.full_name || 'Lumix'

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber,
    clientName,
    clientEmail,
    dueDateLabel,
    items: lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discountRate: item.discountRate,
      lineTotal: item.lineTotal,
    })),
    subtotal,
    taxTotal,
    discountTotal,
    total,
    currency,
    notes: payload.notes,
    senderName,
  })

  const emailPayload = {
    from: resendFrom,
    to: [clientEmail],
    subject: `Invoice ${invoiceNumber} from ${senderName}`,
    text: `Hi ${clientName},\n\nAn invoice has been created for ${formatAmount(total, currency)}.\nDue date: ${dueDateLabel}\n\n${payload.notes ? `Notes: ${payload.notes}\n\n` : ''}Thanks,\n${senderName}`,
    html: `
      <p>Hi ${clientName},</p>
      <p>An invoice has been created for <strong>${formatAmount(total, currency)}</strong>.</p>
      <p>Due date: ${dueDateLabel}</p>
      ${payload.notes ? `<p>Notes: ${payload.notes}</p>` : ''}
      <p>Thanks,<br />${senderName}</p>
    `,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
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
