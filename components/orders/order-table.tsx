'use client'

import { useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { BulkActionsBar } from '@/components/common/bulk-actions-bar'
import { formatDateTime } from '@/lib/utils/dates'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { bulkUpdateOrderStatusAction } from '@/lib/actions/bulk'
import { orderStatuses, type OrderStatus } from '@/types/app'

export function OrderTable({
  orders,
}: {
  orders: Array<{
    id: string
    order_number: string
    branch_name?: string
    customer_name: string
    pickup_location: string
    delivery_location: string
    scheduled_at: string | null
    vehicle_name: string
    driver_name: string
    status: any
  }>
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fi'

  const allSelected = orders.length > 0 && selectedIds.length === orders.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < orders.length

  function toggleAll() {
    setSelectedIds(allSelected ? [] : orders.map((o) => o.id))
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleStatusUpdate(status: OrderStatus) {
    setShowStatusMenu(false)
    startTransition(async () => {
      await bulkUpdateOrderStatusAction(locale, selectedIds, status)
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
            <TableHead>Order Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead>Scheduled At</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} data-selected={selectedIds.includes(order.id) || undefined}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(order.id)}
                  onChange={() => toggleOne(order.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/orders/${order.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                  {order.order_number}
                </Link>
              </TableCell>
              <TableCell className="max-w-[160px]">
                <span className="block truncate">{order.customer_name}</span>
              </TableCell>
              <TableCell>{order.branch_name ?? '—'}</TableCell>
              <TableCell className="max-w-[160px]">
                <span className="block truncate">{order.pickup_location}</span>
              </TableCell>
              <TableCell className="max-w-[160px]">
                <span className="block truncate">{order.delivery_location}</span>
              </TableCell>
              <TableCell>{formatDateTime(order.scheduled_at)}</TableCell>
              <TableCell>{order.vehicle_name}</TableCell>
              <TableCell>{order.driver_name}</TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
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
              {orderStatuses.map((status) => (
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
