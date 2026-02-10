import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import PDFDocument from 'pdfkit'

const formatAmount = (amount: number, currency: string) => {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : ''
  if (!Number.isFinite(amount)) return `${symbol}0.00`
  return `${symbol}${amount.toFixed(2)}`
}

const buildPdf = async (payload: {
  companyName: string
  invoices: Array<{
    invoice_number: string
    client: string
    amount: number
    currency: string
    status: string
    due_date: string | null
    created_at: string
  }>
}) => {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const buffers: Buffer[] = []
    doc.on('data', (data) => buffers.push(data))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    doc.fontSize(18).text('Invoices export')
    doc.moveDown(0.2)
    doc.fontSize(11).text(`Company: ${payload.companyName}`)
    doc.text(`Generated: ${new Date().toLocaleString()}`)
    doc.moveDown(1)

    const headerY = doc.y
    doc.fontSize(10)
    doc.text('Invoice', 40, headerY)
    doc.text('Client', 130, headerY)
    doc.text('Amount', 320, headerY, { width: 80, align: 'right' })
    doc.text('Status', 410, headerY)
    doc.text('Due', 480, headerY)

    let rowY = headerY + 14
    payload.invoices.forEach((invoice) => {
      doc.text(invoice.invoice_number, 40, rowY, { width: 80 })
      doc.text(invoice.client, 130, rowY, { width: 170 })
      doc.text(formatAmount(Number(invoice.amount), invoice.currency || 'EUR'), 320, rowY, { width: 80, align: 'right' })
      doc.text(invoice.status, 410, rowY, { width: 60 })
      doc.text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-', 480, rowY)
      rowY += 16
      if (rowY > 760) {
        doc.addPage()
        rowY = 50
      }
    })

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
    .select('company_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return res.status(403).json({ message: 'You do not have permission to export invoices.' })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  const body = req.body as { ids?: string[] }
  const ids = Array.isArray(body?.ids) ? body.ids : null

  let query = supabase
    .from('invoices')
    .select('invoice_number, client, amount, currency, status, due_date, created_at')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { data: invoices, error } = await query

  if (error) {
    return res.status(500).json({ message: 'Could not load invoices.' })
  }

  const pdfBuffer = await buildPdf({
    companyName: company?.name ?? 'Lumix',
    invoices: invoices ?? [],
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', 'attachment; filename="invoices-export.pdf"')
  return res.status(200).send(pdfBuffer)
}
