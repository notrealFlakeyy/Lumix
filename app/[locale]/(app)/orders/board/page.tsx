import { List } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listOrders } from '@/lib/db/queries/orders'
import { formatDateTime } from '@/lib/utils/dates'

const COLUMNS = [
  { status: 'planned', label: 'Planned', color: 'bg-slate-100 text-slate-700' },
  { status: 'assigned', label: 'Assigned', color: 'bg-sky-100 text-sky-700' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  { status: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
] as const

export default async function OrderBoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)

  const columnData = await Promise.all(
    COLUMNS.map((col) => listOrders(membership.company_id, undefined, membership.branchIds, 1, 100, undefined, col.status)),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Board"
        description="Visual overview of active transport orders by status."
        actions={
          <Button asChild variant="outline">
            <Link href="/orders">
              <List className="mr-2 h-4 w-4" />
              List view
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col, idx) => {
          const orders = columnData[idx].data
          return (
            <div key={col.status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${col.color}`}>{col.label}</span>
                <span className="text-sm text-muted-foreground">{orders.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {orders.length === 0 ? (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-slate-400">No orders</div>
                ) : (
                  orders.map((order) => (
                    <Link key={order.id} href={`/orders/${order.id}`} className="no-underline">
                      <Card className="transition-shadow hover:shadow-soft">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-sm font-semibold text-foreground">{order.order_number}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 pb-4 text-xs text-muted-foreground">
                          <div className="truncate font-medium text-slate-800">{order.customer_name}</div>
                          <div className="truncate">{order.pickup_location}</div>
                          <div className="truncate text-slate-400">→ {order.delivery_location}</div>
                          {order.scheduled_at ? (
                            <div className="text-slate-400">{formatDateTime(order.scheduled_at)}</div>
                          ) : null}
                          {order.driver_name !== '—' ? (
                            <div className="truncate text-sky-600">{order.driver_name}</div>
                          ) : null}
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
