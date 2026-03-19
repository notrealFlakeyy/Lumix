import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { PurchaseInvoiceStatusBadge } from '@/components/purchases/purchase-invoice-status-badge'
import { PurchasePaymentForm } from '@/components/purchases/purchase-payment-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManagePurchases } from '@/lib/auth/permissions'
import { approvePurchaseInvoice, receivePurchaseInvoice, registerPurchasePayment } from '@/lib/db/mutations/purchases'
import { getPurchaseInvoiceById } from '@/lib/db/queries/purchases'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { getOptionalString, getString } from '@/lib/utils/forms'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { purchasePaymentSchema } from '@/lib/validations/purchase-payment'

export default async function PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireModuleAccess(locale, 'purchases')
  const bundle = await getPurchaseInvoiceById(membership.company_id, id, undefined, membership.branchIds)

  if (!bundle) {
    notFound()
  }

  async function approveAction() {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'purchases')
    if (!canManagePurchases(membership.role)) {
      throw new Error('Insufficient permissions to approve purchase bills.')
    }

    await approvePurchaseInvoice(membership.company_id, user.id, id)
    revalidatePath(`/${locale}/purchases`)
    revalidatePath(`/${locale}/purchases/invoices`)
    revalidatePath(`/${locale}/purchases/invoices/${id}`)
  }

  async function receiveAction() {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'purchases')
    if (!canManagePurchases(membership.role)) {
      throw new Error('Insufficient permissions to receive purchase bills.')
    }

    await receivePurchaseInvoice(membership.company_id, user.id, id)
    revalidatePath(`/${locale}/inventory`)
    revalidatePath(`/${locale}/inventory/products`)
    revalidatePath(`/${locale}/purchases`)
    revalidatePath(`/${locale}/purchases/invoices`)
    revalidatePath(`/${locale}/purchases/invoices/${id}`)
  }

  async function paymentAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'purchases')
    if (!canManagePurchases(membership.role)) {
      throw new Error('Insufficient permissions to register payments.')
    }

    const input = purchasePaymentSchema.parse({
      payment_date: getString(formData, 'payment_date'),
      amount: getString(formData, 'amount'),
      reference: getOptionalString(formData, 'reference'),
      notes: getOptionalString(formData, 'notes'),
    })

    await registerPurchasePayment(membership.company_id, user.id, id, input)
    revalidatePath(`/${locale}/purchases`)
    revalidatePath(`/${locale}/purchases/invoices`)
    revalidatePath(`/${locale}/purchases/invoices/${id}`)
    redirect(`/${locale}/purchases/invoices/${id}`)
  }

  const invoice = bundle.invoice

  return (
    <div className="space-y-8">
      <PageHeader
        title={invoice.invoice_number}
        description={`Purchase bill for ${bundle.vendor?.name ?? 'Unknown vendor'} in ${bundle.branch?.name ?? 'Unknown branch'}.`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/purchases/invoices">Back to purchase bills</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card >
          <CardHeader>
            <CardTitle>Bill Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
            <div><span className="font-medium text-foreground">Vendor:</span> {bundle.vendor?.name ?? '-'}</div>
            <div><span className="font-medium text-foreground">Branch:</span> {bundle.branch?.name ?? '-'}</div>
            <div><span className="font-medium text-foreground">Invoice date:</span> {invoice.invoice_date}</div>
            <div><span className="font-medium text-foreground">Due date:</span> {invoice.due_date ?? '-'}</div>
            <div><span className="font-medium text-foreground">Status:</span> <PurchaseInvoiceStatusBadge status={invoice.status} /></div>
            <div><span className="font-medium text-foreground">Receipts:</span> {invoice.received_at ? `Received ${formatDateTime(invoice.received_at)}` : `${bundle.metrics.pending_receipts} pending`}</div>
            <div><span className="font-medium text-foreground">Subtotal:</span> {formatCurrency(Number(invoice.subtotal))}</div>
            <div><span className="font-medium text-foreground">VAT:</span> {formatCurrency(Number(invoice.vat_total))}</div>
            <div><span className="font-medium text-foreground">Total:</span> {formatCurrency(Number(invoice.total))}</div>
            <div><span className="font-medium text-foreground">Balance due:</span> {formatCurrency(bundle.metrics.balance_due)}</div>
            <div className="md:col-span-2"><span className="font-medium text-foreground">Notes:</span> {invoice.notes ?? '-'}</div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canManagePurchases(membership.role) ? (
            <Card >
              <CardHeader>
                <CardTitle>Bill Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={approveAction}>
                  <Button type="submit" variant="outline" disabled={invoice.status === 'approved' || invoice.status === 'paid' || invoice.status === 'partially_paid' || invoice.status === 'cancelled'}>
                    Approve bill
                  </Button>
                </form>
                <form action={receiveAction}>
                  <Button type="submit" variant="outline" disabled={!!invoice.received_at || bundle.metrics.pending_receipts === 0 || invoice.status === 'cancelled'}>
                    Receive linked stock
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canManagePurchases(membership.role) ? (
            <PurchasePaymentForm action={paymentAction} defaultAmount={bundle.metrics.balance_due || Number(invoice.total)} />
          ) : null}
        </div>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Bill Lines</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Inventory link</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Line total</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.product ? `${item.product.sku} | ${item.product.name}` : '-'}</TableCell>
                  <TableCell>{toDisplayNumber(item.quantity, 2)}</TableCell>
                  <TableCell>{formatCurrency(Number(item.unit_price))}</TableCell>
                  <TableCell>{toDisplayNumber(item.vat_rate, 2)}%</TableCell>
                  <TableCell>{formatCurrency(Number(item.line_total))}</TableCell>
                  <TableCell>
                    {item.inventory_product_id ? (
                      item.received_to_stock ? <Badge variant="success">received</Badge> : <Badge variant="warning">pending</Badge>
                    ) : (
                      <Badge variant="default">not linked</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bundle.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
                    <TableCell>{payment.reference ?? '-'}</TableCell>
                    <TableCell>{payment.notes ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
              No payments registered yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
