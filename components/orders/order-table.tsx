import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/dates'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'

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
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
          <TableRow key={order.id}>
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
  )
}
