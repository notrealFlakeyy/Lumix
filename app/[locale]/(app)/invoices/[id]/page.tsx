import { revalidatePath } from 'next/cache'

import { Link } from '@/i18n/navigation'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PaymentForm } from '@/components/invoices/payment-form'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canManageInvoices } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateInvoiceStatus } from '@/lib/db/mutations/invoices'
import { registerPayment } from '@/lib/db/mutations/payments'
import { getInvoiceById } from '@/lib/db/queries/invoices'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { paymentSchema } from '@/lib/validations/payment'
import { getOptionalString, getString } from '@/lib/utils/forms'
import { toNumber } from '@/lib/utils/numbers'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getInvoiceById(membership.company_id, id)
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

  const { invoice, customer, items, payments, trip } = result
  const paidAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const balanceDue = Math.max(0, toNumber(invoice.total) - paidAmount)

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description="Invoice details, items, payments, and export preparation."
        actions={
          <Button type="button" variant="outline" disabled>
            PDF export placeholder
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Invoice Header</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><span className="font-medium text-slate-900">Status:</span> <InvoiceStatusBadge status={invoice.status as any} /></div>
            <div><span className="font-medium text-slate-900">Issue Date:</span> {formatDate(invoice.issue_date)}</div>
            <div><span className="font-medium text-slate-900">Due Date:</span> {formatDate(invoice.due_date)}</div>
            <div><span className="font-medium text-slate-900">Reference Number:</span> {invoice.reference_number ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Linked Trip:</span> {trip ? <Link href={`/trips/${getTripRouteId(trip)}`}>{getTripDisplayId(trip)}</Link> : 'No linked trip'}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div><span className="font-medium text-slate-900">Customer:</span> {customer?.name ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Business ID:</span> {customer?.business_id ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Email:</span> {customer?.email ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Phone:</span> {customer?.phone ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Billing City:</span> {customer?.billing_city ?? '-'}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/90">
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
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No payments registered yet.</div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium text-slate-900">{formatDate(payment.payment_date)}</div>
                    <div className="text-slate-500">{payment.payment_method ?? 'Payment'} {payment.reference ? ` | ${payment.reference}` : ''}</div>
                  </div>
                  <div className="font-medium text-slate-900">{formatCurrency(toNumber(payment.amount))}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Totals Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>Subtotal</span><span className="font-medium text-slate-900">{formatCurrency(toNumber(invoice.subtotal))}</span></div>
            <div className="flex items-center justify-between"><span>VAT Total</span><span className="font-medium text-slate-900">{formatCurrency(toNumber(invoice.vat_total))}</span></div>
            <div className="flex items-center justify-between"><span>Total</span><span className="font-medium text-slate-900">{formatCurrency(toNumber(invoice.total))}</span></div>
            <div className="flex items-center justify-between"><span>Paid Amount</span><span className="font-medium text-slate-900">{formatCurrency(paidAmount)}</span></div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3"><span>Remaining Balance</span><span className="font-semibold text-slate-950">{formatCurrency(balanceDue)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>{invoice.notes ?? 'No invoice notes provided.'}</p>
          <p>PDF generation is intentionally left as a placeholder. The detail page is structured to be printable and production PDF logic can be added later.</p>
        </CardContent>
      </Card>

      <PaymentForm invoiceId={invoice.id} action={paymentAction} />

      <div className="flex flex-wrap gap-3">
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
