import 'server-only'

import PDFDocument from 'pdfkit'

import type { InvoiceDetailBundle } from '@/lib/db/queries/invoices'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'

function writeLabelValue(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
  doc.font('Helvetica').text(value)
}

function writeSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text(title)
  doc.moveDown(0.3)
  doc.font('Helvetica').fontSize(10).fillColor('#334155')
}

export async function buildInvoicePdf(bundle: InvoiceDetailBundle) {
  const { company, invoice, customer, items, payments, trip } = bundle
  const paidAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const balanceDue = Math.max(0, toNumber(invoice.total) - paidAmount)

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: {
        Title: `${invoice.invoice_number} - ${company.name}`,
        Author: company.name,
        Subject: 'Transportation service invoice',
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(company.name)
    doc.moveDown(0.2)
    doc.font('Helvetica').fontSize(10).fillColor('#475569')
    if (company.address_line1) doc.text(company.address_line1)
    if (company.address_line2) doc.text(company.address_line2)
    const cityLine = [company.postal_code, company.city].filter(Boolean).join(' ')
    if (cityLine) doc.text(cityLine)
    doc.text(company.country)
    if (company.business_id) doc.text(`Business ID: ${company.business_id}`)
    if (company.vat_number) doc.text(`VAT: ${company.vat_number}`)
    if (company.email) doc.text(`Email: ${company.email}`)
    if (company.phone) doc.text(`Phone: ${company.phone}`)

    doc.font('Helvetica-Bold').fontSize(26).fillColor('#0f172a').text('INVOICE', 370, 48, { align: 'right' })
    doc.font('Helvetica').fontSize(10).fillColor('#334155')
    doc.text(invoice.invoice_number, 370, 82, { align: 'right' })

    writeSectionTitle(doc, 'Invoice Details')
    writeLabelValue(doc, 'Issue date', formatDate(invoice.issue_date))
    writeLabelValue(doc, 'Due date', formatDate(invoice.due_date))
    writeLabelValue(doc, 'Status', invoice.status)
    writeLabelValue(doc, 'Reference', invoice.reference_number ?? '-')
    writeLabelValue(doc, 'Linked trip', trip?.public_id ?? trip?.id.slice(0, 8).toUpperCase() ?? '-')

    writeSectionTitle(doc, 'Bill To')
    doc.font('Helvetica-Bold').text(customer?.name ?? 'Unknown customer')
    doc.font('Helvetica').text(customer?.billing_address_line1 ?? '-')
    if (customer?.billing_address_line2) doc.text(customer.billing_address_line2)
    const billingCityLine = [customer?.billing_postal_code, customer?.billing_city].filter(Boolean).join(' ')
    if (billingCityLine) doc.text(billingCityLine)
    doc.text(customer?.billing_country ?? company.country)
    if (customer?.business_id) doc.text(`Business ID: ${customer.business_id}`)
    if (customer?.vat_number) doc.text(`VAT: ${customer.vat_number}`)
    if (customer?.email) doc.text(`Email: ${customer.email}`)

    writeSectionTitle(doc, 'Invoice Items')
    const tableStartY = doc.y + 4
    const columns = {
      description: 48,
      quantity: 290,
      unitPrice: 360,
      vatRate: 438,
      total: 500,
    }

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
    doc.text('Description', columns.description, tableStartY)
    doc.text('Qty', columns.quantity, tableStartY)
    doc.text('Unit Price', columns.unitPrice, tableStartY)
    doc.text('VAT', columns.vatRate, tableStartY)
    doc.text('Line Total', columns.total, tableStartY)
    doc.moveTo(48, tableStartY + 14).lineTo(548, tableStartY + 14).strokeColor('#cbd5e1').stroke()

    let rowY = tableStartY + 22
    doc.font('Helvetica').fontSize(9).fillColor('#334155')
    for (const item of items) {
      doc.text(item.description, columns.description, rowY, { width: 220 })
      doc.text(String(item.quantity), columns.quantity, rowY)
      doc.text(formatCurrency(toNumber(item.unit_price)), columns.unitPrice, rowY)
      doc.text(`${item.vat_rate}%`, columns.vatRate, rowY)
      doc.text(formatCurrency(toNumber(item.line_total)), columns.total, rowY)
      rowY += 18
    }

    doc.moveDown(1.2)
    doc.y = Math.max(doc.y, rowY + 14)
    doc.moveTo(320, doc.y).lineTo(548, doc.y).strokeColor('#cbd5e1').stroke()
    doc.moveDown(0.5)
    writeLabelValue(doc, 'Subtotal', formatCurrency(toNumber(invoice.subtotal)))
    writeLabelValue(doc, 'VAT total', formatCurrency(toNumber(invoice.vat_total)))
    writeLabelValue(doc, 'Total', formatCurrency(toNumber(invoice.total)))
    writeLabelValue(doc, 'Paid amount', formatCurrency(paidAmount))
    writeLabelValue(doc, 'Balance due', formatCurrency(balanceDue))

    if (invoice.notes) {
      writeSectionTitle(doc, 'Notes')
      doc.font('Helvetica').text(invoice.notes)
    }

    doc.moveDown(2)
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
    doc.text(`Generated on ${formatDate(new Date())} by ${company.name}.`, 48, doc.page.height - 72)

    doc.end()
  })
}
