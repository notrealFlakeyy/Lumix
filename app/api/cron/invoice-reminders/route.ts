import 'server-only'

import nodemailer from 'nodemailer'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getEmailEnv, hasEmailDeliveryConfig } from '@/lib/env/email'
import { cronRateLimiter } from '@/lib/api/rate-limit'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 401 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await cronRateLimiter.check(5, 'cron-invoice-reminders')
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  if (!hasEmailDeliveryConfig()) {
    return Response.json({ skipped: true, reason: 'Email not configured' })
  }

  const supabase = createSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: overdueInvoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, company_id, customer_id, total, due_date')
    .lt('due_date', today)
    .in('status', ['draft', 'sent', 'partially_paid'])

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!overdueInvoices || overdueInvoices.length === 0) {
    return Response.json({ sent: 0, message: 'No overdue invoices found' })
  }

  const companyIds = [...new Set(overdueInvoices.map((i) => i.company_id))]
  const customerIds = [...new Set(overdueInvoices.map((i) => i.customer_id).filter(Boolean))]

  const [{ data: companies }, { data: customers }] = await Promise.all([
    supabase.from('companies').select('id, name, email').in('id', companyIds),
    supabase.from('customers').select('id, name, email').in('id', customerIds),
  ])

  const companyMap = new Map((companies ?? []).map((c) => [c.id, c]))
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]))

  const env = getEmailEnv()
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })

  let sent = 0
  const errors: string[] = []

  for (const invoice of overdueInvoices) {
    const customer = customerMap.get(invoice.customer_id)
    if (!customer?.email) continue

    const company = companyMap.get(invoice.company_id)
    if (!company) continue

    const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86_400_000)
    const total = formatCurrency(toNumber(invoice.total))

    const subject = `Payment reminder: ${company.name} invoice ${invoice.invoice_number}`
    const text = [
      `Hello ${customer.name},`,
      ``,
      `This is a reminder that invoice ${invoice.invoice_number} from ${company.name} is overdue.`,
      ``,
      `Invoice number: ${invoice.invoice_number}`,
      `Due date: ${formatDate(invoice.due_date)}`,
      `Days overdue: ${daysOverdue}`,
      `Amount due: ${total}`,
      ``,
      `Please arrange payment at your earliest convenience.`,
      `If you have already paid, please disregard this message.`,
    ].join('\n')

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <p>Hello ${customer.name},</p>
        <p>This is a reminder that invoice <strong>${invoice.invoice_number}</strong> from <strong>${company.name}</strong> is overdue.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Invoice number</td><td>${invoice.invoice_number}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Due date</td><td>${formatDate(invoice.due_date)}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #475569; color: #dc2626;">Days overdue</td><td style="color: #dc2626; font-weight: 600;">${daysOverdue}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #475569;">Amount due</td><td>${total}</td></tr>
        </table>
        <p>Please arrange payment at your earliest convenience.</p>
        <p style="color: #64748b; font-size: 0.875rem;">If you have already paid, please disregard this message.</p>
      </div>
    `

    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to: customer.email,
        replyTo: company.email ?? undefined,
        subject,
        text,
        html,
      })
      sent++
    } catch (err) {
      errors.push(`${invoice.invoice_number}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return Response.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
