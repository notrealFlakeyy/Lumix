import { Plus } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { CustomerTable } from '@/components/customers/customer-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CsvExportButton } from '@/components/ui/csv-export-button'
import { CsvImportButton } from '@/components/common/csv-import-button'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listCustomers } from '@/lib/db/queries/customers'

const PAGE_SIZE = 50

export default async function CustomersPage({
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
  const { data: customers, total } = await listCustomers(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Maintain transport customers, billing contacts, and account context for dispatch and invoicing."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              New customer
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Suspense>
              <TableSearch placeholder="Search name, email, business ID..." />
            </Suspense>
            <div className="flex items-center gap-2">
              <CsvImportButton resource="customers" companyId={membership.company_id} />
              <CsvExportButton resource="customers" />
            </div>
          </div>
          {customers.length > 0 ? (
            <>
              <CustomerTable customers={customers} />
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/customers?page=${p}${q ? `&q=${q}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              {q ? 'No customers match your search.' : 'No customers yet.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
