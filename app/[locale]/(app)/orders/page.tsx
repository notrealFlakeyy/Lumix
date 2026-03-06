import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { OrderTable } from '@/components/orders/order-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listOrders } from '@/lib/db/queries/orders'

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const orders = await listOrders(membership.company_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track transport orders from planning through assignment, execution, and invoicing."
        actions={
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="mr-2 h-4 w-4" />
              New order
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {orders.length > 0 ? <OrderTable orders={orders} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No transport orders yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
