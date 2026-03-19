import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canManageOrders } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { updateOrderStatus } from '@/lib/db/mutations/orders'
import { createTripFromOrder } from '@/lib/db/mutations/trips'
import { getOrderById } from '@/lib/db/queries/orders'
import { formatDateTime } from '@/lib/utils/dates'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getOrderById(membership.company_id, id, undefined, membership.branchIds)
  if (!result) return null

  async function changeStatus(status: 'assigned' | 'in_progress' | 'completed') {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')
    await updateOrderStatus(membership.company_id, user.id, id, status)
    revalidatePath(`/${locale}/orders/${id}`)
    revalidatePath(`/${locale}/orders`)
  }

  async function createTripAction() {
    'use server'
    const { user, membership } = await requireCompany(locale)
    if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')
    const trip = await createTripFromOrder(membership.company_id, user.id, id)
    revalidatePath(`/${locale}/orders/${id}`)
    revalidatePath(`/${locale}/trips`)
    redirect(`/${locale}/trips/${getTripRouteId(trip)}`)
  }

  const { order, branch, customer, vehicle, driver, trip } = result

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        description="Transport order summary, assignment details, and linked trip flow."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/orders/${order.id}/edit`}>Edit order</Link>
            </Button>
            {!trip ? (
              <form action={createTripAction}>
                <Button type="submit">Create trip from order</Button>
              </form>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card >
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3"><span className="font-medium text-foreground">Status:</span> <OrderStatusBadge status={order.status as any} /></div>
            <div><span className="font-medium text-foreground">Branch:</span> {branch?.name ?? 'No branch assigned'}</div>
            <div><span className="font-medium text-foreground">Customer:</span> {customer?.name ?? '-'}</div>
            <div><span className="font-medium text-foreground">Pickup:</span> {order.pickup_location}</div>
            <div><span className="font-medium text-foreground">Delivery:</span> {order.delivery_location}</div>
            <div><span className="font-medium text-foreground">Scheduled At:</span> {formatDateTime(order.scheduled_at)}</div>
            <div><span className="font-medium text-foreground">Cargo:</span> {order.cargo_description ?? '-'}</div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Vehicle:</span> {vehicle ? `${vehicle.registration_number} ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : 'Unassigned'}</div>
            <div><span className="font-medium text-foreground">Driver:</span> {driver?.full_name ?? 'Unassigned'}</div>
            <div><span className="font-medium text-foreground">Driver contact:</span> {driver?.phone ?? '-'}</div>
            <div><span className="font-medium text-foreground">Linked Trip:</span> {trip ? <Link href={`/trips/${getTripRouteId(trip)}`}>{getTripDisplayId(trip)}</Link> : 'No trip yet'}</div>
          </CardContent>
        </Card>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{order.notes ?? 'No order notes captured.'}</CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <form action={changeStatus.bind(null, 'assigned')}>
          <Button type="submit" variant="outline">Mark as assigned</Button>
        </form>
        <form action={changeStatus.bind(null, 'in_progress')}>
          <Button type="submit" variant="outline">Mark as in progress</Button>
        </form>
        <form action={changeStatus.bind(null, 'completed')}>
          <Button type="submit" variant="outline">Mark as completed</Button>
        </form>
      </div>
    </div>
  )
}
