'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { BulkActionsBar } from '@/components/common/bulk-actions-bar'
import { formatDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { bulkUpdateInvoiceStatusAction } from '@/lib/actions/bulk'
import { invoiceStatuses, type InvoiceStatus } from '@/types/app'

export function InvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: string
    invoice_number: string
    branch_name?: string
    customer_name: string
    issue_date: string
    due_date: string
    total: string
    status: any
  }>
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fi'

  const allSelected = invoices.length > 0 && selectedIds.length === invoices.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < invoices.length

  function toggleAll() {
    setSelectedIds(allSelected ? [] : invoices.map((inv) => inv.id))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleStatusUpdate(status: InvoiceStatus) {
    setShowStatusMenu(false)
    startTransition(async () => {
      await bulkUpdateInvoiceStatusAction(locale, selectedIds, status)
      setSelectedIds([])
      router.refresh()
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-slate-300"
              />
            </TableHead>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} data-selected={selectedIds.includes(invoice.id) || undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(invoice.id)}
                  onChange={() => toggleOne(invoice.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/invoices/${invoice.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                  {invoice.invoice_number}
                </Link>
              </TableCell>
              <TableCell className="max-w-[180px]">
                <span className="block truncate">{invoice.customer_name}</span>
              </TableCell>
              <TableCell>{invoice.branch_name ?? '—'}</TableCell>
              <TableCell>{formatDate(invoice.issue_date)}</TableCell>
              <TableCell>{formatDate(invoice.due_date)}</TableCell>
              <TableCell>{formatCurrency(Number(invoice.total ?? 0))}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BulkActionsBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])}>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setShowStatusMenu((prev) => !prev)}
            className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
          >
            {isPending ? 'Updating...' : 'Update Status'}
          </Button>
          {showStatusMenu && (
            <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-lg">
              {invoiceStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  className="block w-full whitespace-nowrap px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      </BulkActionsBar>
    </>
  )
}
