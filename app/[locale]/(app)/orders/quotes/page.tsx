import { FileText, Plus } from 'lucide-react'
import { Suspense } from 'react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { QuoteStatusBadge } from '@/components/orders/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusFilter } from '@/components/ui/status-filter'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSearch } from '@/components/ui/table-search'
import { requireCompany } from '@/lib/auth/require-company'
import { listQuotes } from '@/lib/db/queries/quotes'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/dates'
import type { QuoteStatus } from '@/types/app'

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

export default async function QuotesPage({
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
  const { data: quotes, total } = await listQuotes(membership.company_id, undefined, membership.branchIds, page, PAGE_SIZE, q, status)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        description="Create transport quotes, send offers, and convert accepted work into planned orders."
        actions={
          <Button asChild>
            <Link href="/orders/quotes/new">
              <Plus className="mr-2 h-4 w-4" />
              New quote
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Suspense>
              <TableSearch placeholder="Search quote number, title, route..." />
            </Suspense>
            <Suspense>
              <StatusFilter options={STATUS_OPTIONS} />
            </Suspense>
          </div>

          {quotes.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-3">Quote</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Branch</th>
                      <th className="px-3 py-3">Route</th>
                      <th className="px-3 py-3">Valid Until</th>
                      <th className="px-3 py-3">Total</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-3">
                          <Link href={`/orders/quotes/${quote.id}`} className="font-medium text-slate-950 no-underline hover:text-sky-700">
                            {quote.quote_number}
                          </Link>
                          <div className="text-xs text-slate-500">{quote.title}</div>
                        </td>
                        <td className="px-3 py-3">{quote.customer_name}</td>
                        <td className="px-3 py-3">{quote.branch_name}</td>
                        <td className="px-3 py-3">
                          <div className="max-w-[240px] truncate">{quote.pickup_location}</div>
                          <div className="max-w-[240px] truncate text-xs text-slate-500">{quote.delivery_location}</div>
                        </td>
                        <td className="px-3 py-3">{formatDate(quote.valid_until)}</td>
                        <td className="px-3 py-3">{formatCurrency(Number(quote.total ?? 0))}</td>
                        <td className="px-3 py-3">
                          <QuoteStatusBadge status={quote.status as QuoteStatus} />
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {quote.converted_order_id && quote.converted_order_number ? (
                            <Link href={`/orders/${quote.converted_order_id}`}>{quote.converted_order_number}</Link>
                          ) : (
                            'Not converted'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => `/orders/quotes?page=${p}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {q || status ? 'No quotes match your search.' : 'No quotes created yet.'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
