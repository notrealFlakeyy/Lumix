import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getVehicleById } from '@/lib/db/queries/vehicles'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber, toNumber } from '@/lib/utils/numbers'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getVehicleById(membership.company_id, id)
  if (!result) return null

  const { vehicle, orders, trips, revenue } = result

  return (
    <div className="space-y-6">
      <PageHeader title={vehicle.registration_number} description="Vehicle details, assignments, and related trip activity." actions={<Button asChild variant="outline"><Link href={`/vehicles/${vehicle.id}/edit`}>Edit vehicle</Link></Button>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div><span className="font-medium text-slate-900">Make / Model:</span> {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</div>
            <div><span className="font-medium text-slate-900">Year:</span> {vehicle.year ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Fuel Type:</span> {vehicle.fuel_type ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Current KM:</span> {toDisplayNumber(vehicle.current_km)} km</div>
            <div><span className="font-medium text-slate-900">Next Service KM:</span> {vehicle.next_service_km ? `${toDisplayNumber(vehicle.next_service_km)} km` : '-'}</div>
            <div><span className="font-medium text-slate-900">Status:</span> {vehicle.is_active ? 'Active' : 'Inactive'}</div>
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
              Estimated revenue by vehicle based on invoiced trips: <span className="font-semibold text-slate-950">{formatCurrency(revenue)}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
