import { Link } from '@/i18n/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'

export function RecentActivity({
  orders,
  invoices,
}: {
  orders: Array<{ id: string; orderNumber: string; customerName: string; status: any; scheduledAt: string | null }>
  invoices: Array<{ id: string; invoiceNumber: string; customerName: string; total: number; status: any; dueDate: string }>
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card >
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No orders yet.</div>
          ) : (
            orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 no-underline hover:border-slate-200">
                <div className="min-w-0">
                  <div className="font-medium text-slate-950">{order.orderNumber}</div>
                  <div className="truncate text-sm text-slate-500">{order.customerName}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(order.scheduledAt)}</div>
                </div>
                <OrderStatusBadge status={order.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No invoices yet.</div>
          ) : (
            invoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3 no-underline hover:border-slate-200">
                <div className="min-w-0">
                  <div className="font-medium text-slate-950">{invoice.invoiceNumber}</div>
                  <div className="truncate text-sm text-slate-500">{invoice.customerName}</div>
                  <div className="text-xs text-slate-400">{formatCurrency(invoice.total)}</div>
                </div>
                <InvoiceStatusBadge status={invoice.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
