import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PaymentForm } from '@/components/invoices/payment-form'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canManageInvoices } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { sendInvoiceToCustomer, updateInvoiceStatus } from '@/lib/db/mutations/invoices'
import { registerPayment } from '@/lib/db/mutations/payments'
import { getInvoiceById } from '@/lib/db/queries/invoices'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { paymentSchema } from '@/lib/validations/payment'
import { getOptionalString, getString } from '@/lib/utils/forms'
import { toNumber } from '@/lib/utils/numbers'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'
import { buildInvoicePdfPath } from '@/lib/utils/invoice'
import { hasEmailDeliveryConfig } from '@/lib/env/email'

function buildInvoiceDetailHref(locale: string, id: string, extras?: Record<string, string>) {
  const params = new URLSearchParams(extras)
  const query = params.toString()
  return `/${locale}/invoices/${id}${query ? `?${query}` : ''}`
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { locale, id } = await params
  const { success, error } = await searchParams
  const { membership } = await requireCompany(locale)
  const result = await getInvoiceById(membership.company_id, id, undefined, membership.branchIds)
  if (!result) return null

  async function markStatus(status: 'sent' | 'cancelled') {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')
    await updateInvoiceStatus(membership.company_id, user.id, id, status)
    revalidatePath(`/${locale}/invoices/${id}`)
    revalidatePath(`/${locale}/invoices`)
  }

  async function paymentAction(formData: FormData) {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')

    const input = paymentSchema.parse({
      invoice_id: getString(formData, 'invoice_id'),
      payment_date: getString(formData, 'payment_date'),
      amount: getString(formData, 'amount'),
      payment_method: getOptionalString(formData, 'payment_method'),
      reference: getOptionalString(formData, 'reference'),
    })

    await registerPayment(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/invoices/${id}`)
    revalidatePath(`/${locale}/invoices`)
  }

  async function sendInvoiceAction() {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageInvoices(membership.role)) {
      redirect(buildInvoiceDetailHref(locale, id, { error: 'Insufficient permissions.' }))
    }

    try {
      await sendInvoiceToCustomer(membership.company_id, user.id, id, locale)
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Unable to send invoice email.'
      redirect(buildInvoiceDetailHref(locale, id, { error: message }))
    }

    revalidatePath(`/${locale}/invoices/${id}`)
    revalidatePath(`/${locale}/invoices`)
    redirect(buildInvoiceDetailHref(locale, id, { success: 'Invoice email sent successfully.' }))
  }

  const { company, invoice, branch, customer, items, payments, trip } = result
  const paidAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const balanceDue = Math.max(0, toNumber(invoice.total) - paidAmount)
  const pdfPath = buildInvoicePdfPath(locale, invoice.id)
  const canEmailInvoice = canManageInvoices(membership.role) && Boolean(customer?.email) && hasEmailDeliveryConfig()

  return (
    <div className="space-y-6">
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{success}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">{error}</div> : null}

      <PageHeader
        title={invoice.invoice_number}
        description="Invoice details, PDF output, outbound delivery, and payment follow-up."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" asChild>
              <a href={`${pdfPath}?download=1`}>Download PDF</a>
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href={pdfPath} target="_blank" rel="noreferrer">
                Open printable PDF
              </a>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <Card >
          <CardHeader>
            <CardTitle>Issuer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Company:</span> {company.name}</div>
            <div><span className="font-medium text-foreground">Email:</span> {company.email ?? '-'}</div>
            <div><span className="font-medium text-foreground">Phone:</span> {company.phone ?? '-'}</div>
            <div><span className="font-medium text-foreground">Business ID:</span> {company.business_id ?? '-'}</div>
            <div><span className="font-medium text-foreground">VAT Number:</span> {company.vat_number ?? '-'}</div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Invoice Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3"><span className="font-medium text-foreground">Status:</span> <InvoiceStatusBadge status={invoice.status as any} /></div>
            <div><span className="font-medium text-foreground">Branch:</span> {branch?.name ?? 'No branch assigned'}</div>
            <div><span className="font-medium text-foreground">Issue Date:</span> {formatDate(invoice.issue_date)}</div>
            <div><span className="font-medium text-foreground">Due Date:</span> {formatDate(invoice.due_date)}</div>
            <div><span className="font-medium text-foreground">Reference Number:</span> {invoice.reference_number ?? '-'}</div>
            <div><span className="font-medium text-foreground">Linked Trip:</span> {trip ? <Link href={`/trips/${getTripRouteId(trip)}`}>{getTripDisplayId(trip)}</Link> : 'No linked trip'}</div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Customer:</span> {customer?.name ?? '-'}</div>
            <div><span className="font-medium text-foreground">Business ID:</span> {customer?.business_id ?? '-'}</div>
            <div><span className="font-medium text-foreground">Email:</span> {customer?.email ?? '-'}</div>
            <div><span className="font-medium text-foreground">Phone:</span> {customer?.phone ?? '-'}</div>
            <div><span className="font-medium text-foreground">Billing City:</span> {customer?.billing_city ?? '-'}</div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Recipient:</span> {customer?.email ?? 'Missing customer email'}</div>
            <div><span className="font-medium text-foreground">PDF URL:</span> {invoice.pdf_url ? <a href={invoice.pdf_url} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4">Stored PDF link</a> : 'Generated on demand from this page'}</div>
            <div><span className="font-medium text-foreground">SMTP delivery:</span> {hasEmailDeliveryConfig() ? 'Configured' : 'Not configured'}</div>
            {!customer?.email ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                Add a billing email on the customer record before sending this invoice.
              </div>
            ) : null}
            {!hasEmailDeliveryConfig() ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
                Configure SMTP env vars before using invoice email delivery. PDF download is already available.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>VAT Rate</TableHead>
                <TableHead>Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(toNumber(item.unit_price))}</TableCell>
                  <TableCell>{item.vat_rate}%</TableCell>
                  <TableCell>{formatCurrency(toNumber(item.line_total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card >
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No payments registered yet.</div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{formatDate(payment.payment_date)}</div>
                    <div className="text-muted-foreground">{payment.payment_method ?? 'Payment'} {payment.reference ? ` | ${payment.reference}` : ''}</div>
                  </div>
                  <div className="font-medium text-foreground">{formatCurrency(toNumber(payment.amount))}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Totals Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-medium text-foreground">{formatCurrency(toNumber(invoice.subtotal))}</span></div>
            <div className="flex items-center justify-between"><span>VAT Total</span><span className="font-medium text-foreground">{formatCurrency(toNumber(invoice.vat_total))}</span></div>
            <div className="flex items-center justify-between"><span>Total</span><span className="font-medium text-foreground">{formatCurrency(toNumber(invoice.total))}</span></div>
            <div className="flex items-center justify-between"><span>Paid Amount</span><span className="font-medium text-foreground">{formatCurrency(paidAmount)}</span></div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span>Remaining Balance</span><span className="font-semibold text-foreground">{formatCurrency(balanceDue)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{invoice.notes ?? 'No invoice notes provided.'}</p>
          <p>PDF output is now generated from the live invoice payload. Sent invoices attach the same PDF that is available from this page.</p>
        </CardContent>
      </Card>

      <PaymentForm invoiceId={invoice.id} action={paymentAction} />

      <div className="flex flex-wrap gap-3">
        <form action={sendInvoiceAction}>
          <Button type="submit" disabled={!canEmailInvoice}>
            Send invoice email
          </Button>
        </form>
        <form action={markStatus.bind(null, 'sent')}>
          <Button type="submit" variant="outline">Mark as sent</Button>
        </form>
        <form action={markStatus.bind(null, 'cancelled')}>
          <Button type="submit" variant="outline">Mark as cancelled</Button>
        </form>
      </div>
    </div>
  )
}
