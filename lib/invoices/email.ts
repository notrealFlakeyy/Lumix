import 'server-only'

import nodemailer from 'nodemailer'

import type { InvoiceDetailBundle } from '@/lib/db/queries/invoices'
import { requireEmailDeliveryConfig } from '@/lib/env/email'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  const env = requireEmailDeliveryConfig()
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })

  return cachedTransporter
}

export async function sendInvoiceEmail(bundle: InvoiceDetailBundle, pdfBuffer: Buffer, pdfFileName: string) {
  const transporter = getTransporter()
  const env = requireEmailDeliveryConfig()
  const { company, invoice, customer, trip } = bundle

  if (!customer?.email) {
    throw new Error('The selected customer does not have a billing email address.')
  }

  const total = formatCurrency(toNumber(invoice.total))
  const balanceDue = formatCurrency(
    Math.max(
      0,
      toNumber(invoice.total) - bundle.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
    ),
  )
  const tripReference = trip?.public_id ?? trip?.id.slice(0, 8).toUpperCase() ?? 'No trip reference'
  const subject = `${company.name} invoice ${invoice.invoice_number}`
  const text = [
    `Hello,`,
    ``,
    `Please find attached invoice ${invoice.invoice_number} from ${company.name}.`,
    `Issue date: ${formatDate(invoice.issue_date)}`,
    `Due date: ${formatDate(invoice.due_date)}`,
    `Total: ${total}`,
    `Outstanding balance: ${balanceDue}`,
    `Trip reference: ${tripReference}`,
    ``,
    `If you have any questions, please reply to this email.`,
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <p>Hello,</p>
      <p>Please find attached invoice <strong>${invoice.invoice_number}</strong> from <strong>${company.name}</strong>.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Issue date</td><td>${formatDate(invoice.issue_date)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Due date</td><td>${formatDate(invoice.due_date)}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Total</td><td>${total}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Outstanding balance</td><td>${balanceDue}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Trip reference</td><td>${tripReference}</td></tr>
      </table>
      <p>If you have any questions, please reply to this email.</p>
    </div>
  `

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: customer.email,
    replyTo: env.SMTP_REPLY_TO ?? company.email ?? undefined,
    subject,
    text,
    html,
    attachments: [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}
