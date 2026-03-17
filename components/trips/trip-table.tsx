'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { BulkActionsBar } from '@/components/common/bulk-actions-bar'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'
import { bulkGenerateInvoicesFromTripsAction } from '@/lib/actions/bulk'

export function TripTable({
  trips,
}: {
  trips: Array<{
    id: string
    public_id?: string | null
    branch_name?: string
    customer_name: string
    vehicle_name: string
    driver_name: string
    start_time: string | null
    end_time: string | null
    distance_km: string | null
    waiting_time_minutes: number
    status: any
  }>
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fi'

  const allSelected = trips.length > 0 && selectedIds.length === trips.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < trips.length

  function toggleAll() {
    setSelectedIds(allSelected ? [] : trips.map((t) => t.id))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleGenerateInvoices() {
    startTransition(async () => {
      await bulkGenerateInvoicesFromTripsAction(locale, selectedIds)
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
            <TableHead>Trip ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Distance KM</TableHead>
            <TableHead>Waiting Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((trip) => (
            <TableRow key={trip.id} data-selected={selectedIds.includes(trip.id) || undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(trip.id)}
                  onChange={() => toggleOne(trip.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/trips/${getTripRouteId(trip)}`} className="text-slate-950 no-underline hover:text-sky-700">
                  {getTripDisplayId(trip)}
                </Link>
              </TableCell>
              <TableCell className="max-w-[160px]">
                <span className="block truncate">{trip.customer_name}</span>
              </TableCell>
              <TableCell>{trip.branch_name ?? '—'}</TableCell>
              <TableCell>{trip.vehicle_name}</TableCell>
              <TableCell className="max-w-[140px]">
                <span className="block truncate">{trip.driver_name}</span>
              </TableCell>
              <TableCell>{formatDateTime(trip.start_time)}</TableCell>
              <TableCell>{formatDateTime(trip.end_time)}</TableCell>
              <TableCell>{trip.distance_km ? `${toDisplayNumber(trip.distance_km, 0)} km` : '—'}</TableCell>
              <TableCell>{trip.waiting_time_minutes} min</TableCell>
              <TableCell>
                <TripStatusBadge status={trip.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BulkActionsBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])}>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleGenerateInvoices}
          className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
        >
          {isPending ? 'Generating...' : 'Generate Invoices'}
        </Button>
      </BulkActionsBar>
    </>
  )
}
