import { Plus } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TripTable } from '@/components/trips/trip-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { StatusFilter } from '@/components/ui/status-filter'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listTrips } from '@/lib/db/queries/trips'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default async function TripsPage({
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
  const { data: trips, total } = await listTrips(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q, status)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Monitor trip execution, odometer capture, waiting time, and invoicing readiness."
        actions={
          <Button asChild>
            <Link href="/trips/new">
              <Plus className="mr-2 h-4 w-4" />
              New trip
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Suspense>
                <TableSearch placeholder="Search trip ID..." />
              </Suspense>
              <Suspense>
                <StatusFilter options={STATUS_OPTIONS} />
              </Suspense>
            </div>
            <CsvExportButton resource="trips" />
          </div>
          {trips.length > 0 ? (
            <>
              <TripTable trips={trips} />
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/trips?page=${p}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              {q || status ? 'No trips match your search.' : 'No trips yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
