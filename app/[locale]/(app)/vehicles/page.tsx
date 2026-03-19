import { Plus } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { VehicleTable } from '@/components/vehicles/vehicle-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listVehicles } from '@/lib/db/queries/vehicles'

const PAGE_SIZE = 50

export default async function VehiclesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const { locale } = await params
  const { page: pageParam, q } = await searchParams
  const page = Math.max(1, Number(pageParam ?? 1))
  const { membership } = await requireCompany(locale)
  const { data: vehicles, total } = await listVehicles(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage fleet records, service planning context, and current odometer values for dispatch."
        actions={
          <Button asChild>
            <Link href="/vehicles/new">
              <Plus className="mr-2 h-4 w-4" />
              New vehicle
            </Link>
          </Button>
        }
      />
      <Card >
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Suspense>
              <TableSearch placeholder="Search registration, make, model..." />
            </Suspense>
            <CsvExportButton resource="vehicles" />
          </div>
          {vehicles.length > 0 ? (
            <>
              <VehicleTable vehicles={vehicles} />
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/vehicles?page=${p}${q ? `&q=${q}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
              {q ? 'No vehicles match your search.' : 'No vehicles yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
