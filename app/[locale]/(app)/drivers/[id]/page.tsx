import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getDriverById } from '@/lib/db/queries/drivers'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'
import { getDriverRouteId, getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getDriverById(membership.company_id, id)
  if (!result) return null

  const { driver, orders, trips, revenue } = result

  return (
    <div className="space-y-6">
      <PageHeader title={driver.full_name} description="Driver profile, current assignments, and related trip activity." actions={<Button asChild variant="outline"><Link href={`/drivers/${getDriverRouteId(driver)}/edit`}>Edit driver</Link></Button>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Driver Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div><span className="font-medium text-slate-900">Phone:</span> {driver.phone ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Email:</span> {driver.email ?? '-'}</div>
            <div><span className="font-medium text-slate-900">License Type:</span> {driver.license_type ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Employment Type:</span> {driver.employment_type ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Status:</span> {driver.is_active ? 'Active' : 'Inactive'}</div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Assigned Orders</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><Link href={`/orders/${order.id}`}>{order.order_number}</Link></TableCell>
                      <TableCell>{order.pickup_location}</TableCell>
                      <TableCell>{order.delivery_location}</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Related Trips</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell><Link href={`/trips/${getTripRouteId(trip)}`}>{getTripDisplayId(trip)}</Link></TableCell>
                      <TableCell>{formatDateTime(trip.start_time)}</TableCell>
                      <TableCell>{formatDateTime(trip.end_time)}</TableCell>
                      <TableCell>{trip.distance_km ? `${toNumber(trip.distance_km)} km` : '-'}</TableCell>
                      <TableCell>{trip.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Revenue Contribution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Estimated revenue by driver based on linked trips: <span className="font-semibold text-slate-950">{formatCurrency(revenue)}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
