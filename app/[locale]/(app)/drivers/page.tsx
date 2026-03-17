import { Plus } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { DriverTable } from '@/components/drivers/driver-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CsvImportButton } from '@/components/common/csv-import-button'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listDrivers } from '@/lib/db/queries/drivers'

const PAGE_SIZE = 50

export default async function DriversPage({
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
  const { data: drivers, total } = await listDrivers(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Maintain active drivers, license details, and assignment readiness."
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="mr-2 h-4 w-4" />
              New driver
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Suspense>
              <TableSearch placeholder="Search name, email, phone..." />
            </Suspense>
            <div className="flex items-center gap-2">
              <CsvImportButton resource="drivers" companyId={membership.company_id} />
              <CsvExportButton resource="drivers" />
            </div>
          </div>
          {drivers.length > 0 ? (
            <>
              <DriverTable drivers={drivers} />
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/drivers?page=${p}${q ? `&q=${q}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              {q ? 'No drivers match your search.' : 'No drivers yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
