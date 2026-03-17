import { FileText, LayoutGrid, Plus, Repeat } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { OrderTable } from '@/components/orders/order-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { StatusFilter } from '@/components/ui/status-filter'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listOrders } from '@/lib/db/queries/orders'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const { locale } = await params
  const { page: pageParam, q, status } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const { membership } = await requireCompany(locale)
  const { data: orders, total } = await listOrders(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q, status)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track transport orders from planning through assignment, execution, and invoicing."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/orders/board">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Board
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/orders/recurring">
                <Repeat className="mr-2 h-4 w-4" />
                Recurring
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/orders/quotes">
                <FileText className="mr-2 h-4 w-4" />
                Quotes
              </Link>
            </Button>
            <Button asChild>
              <Link href="/orders/new">
                <Plus className="mr-2 h-4 w-4" />
                New order
              </Link>
            </Button>
          </div>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Suspense>
                <TableSearch placeholder="Search order number, location..." />
              </Suspense>
              <Suspense>
                <StatusFilter options={STATUS_OPTIONS} />
              </Suspense>
            </div>
            <CsvExportButton resource="orders" />
          </div>
          {orders.length > 0 ? (
            <>
              <OrderTable orders={orders} />
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/orders?page=${p}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              {q || status ? 'No orders match your search.' : 'No transport orders yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
