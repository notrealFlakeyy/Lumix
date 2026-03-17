import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import type { QuoteStatus } from '@/types/app'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { QuoteStatusBadge } from '@/components/orders/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { convertQuoteToOrder, updateQuoteStatus } from '@/lib/db/mutations/quotes'
import { getQuoteById } from '@/lib/db/queries/quotes'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getQuoteById(membership.company_id, id, undefined, membership.branchIds)

  if (!result) notFound()

  async function changeStatus(status: QuoteStatus) {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    await updateQuoteStatus(membership.company_id, user.id, id, status)
    revalidatePath(`/${locale}/orders/quotes`)
    revalidatePath(`/${locale}/orders/quotes/${id}`)
  }

  async function convertAction() {
    'use server'

    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

    const order = await convertQuoteToOrder(membership.company_id, user.id, id)
    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/orders/quotes`)
    revalidatePath(`/${locale}/orders/quotes/${id}`)
    redirect(`/${locale}/orders/${order.id}`)
  }

  const { quote, items, customer, branch, convertedOrder } = result

  return (
    <div className="space-y-6">
      <PageHeader
        title={quote.quote_number}
        description={quote.title}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/orders/quotes/${quote.id}/edit`}>Edit quote</Link>
            </Button>
            {!quote.converted_order_id ? (
              <form action={convertAction}>
                <Button type="submit">Convert to order</Button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center gap-3"><span className="font-medium text-slate-900">Status:</span> <QuoteStatusBadge status={quote.status as QuoteStatus} /></div>
            <div><span className="font-medium text-slate-900">Customer:</span> {customer?.name ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Branch:</span> {branch?.name ?? 'No branch assigned'}</div>
            <div><span className="font-medium text-slate-900">Issue date:</span> {formatDate(quote.issue_date)}</div>
            <div><span className="font-medium text-slate-900">Valid until:</span> {formatDate(quote.valid_until)}</div>
            <div><span className="font-medium text-slate-900">Pickup:</span> {quote.pickup_location}</div>
            <div><span className="font-medium text-slate-900">Delivery:</span> {quote.delivery_location}</div>
            <div><span className="font-medium text-slate-900">Cargo:</span> {quote.cargo_description ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Converted order:</span> {convertedOrder ? <Link href={`/orders/${convertedOrder.id}`}>{convertedOrder.order_number}</Link> : 'Not converted yet'}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="px-2 py-2">VAT</th>
                    <th className="px-2 py-2">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2">{item.description}</td>
                      <td className="px-2 py-2">{toNumber(item.quantity).toFixed(2)}</td>
                      <td className="px-2 py-2">{toNumber(item.unit_price).toFixed(2)}</td>
                      <td className="px-2 py-2">{toNumber(item.vat_rate).toFixed(2)}%</td>
                      <td className="px-2 py-2">{toNumber(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatCurrency(toNumber(quote.subtotal))}</span></div>
              <div className="flex items-center justify-between"><span>VAT</span><span>{formatCurrency(toNumber(quote.vat_total))}</span></div>
              <div className="flex items-center justify-between font-medium text-slate-950"><span>Total</span><span>{formatCurrency(toNumber(quote.total))}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">{quote.notes ?? 'No internal notes captured.'}</CardContent>
      </Card>

      {!quote.converted_order_id ? (
        <div className="flex flex-wrap gap-3">
          <form action={changeStatus.bind(null, 'sent')}>
            <Button type="submit" variant="outline">Mark as sent</Button>
          </form>
          <form action={changeStatus.bind(null, 'accepted')}>
            <Button type="submit" variant="outline">Mark as accepted</Button>
          </form>
          <form action={changeStatus.bind(null, 'rejected')}>
            <Button type="submit" variant="outline">Mark as rejected</Button>
          </form>
          <form action={changeStatus.bind(null, 'expired')}>
            <Button type="submit" variant="outline">Mark as expired</Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
