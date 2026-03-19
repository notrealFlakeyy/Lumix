import { AlertTriangle } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getVehicleById } from '@/lib/db/queries/vehicles'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber, toNumber } from '@/lib/utils/numbers'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getVehicleById(membership.company_id, id, undefined, membership.branchIds)
  if (!result) return null

  const { vehicle, orders, trips, revenue, maintenanceLogs } = result
  const serviceDue = vehicle.next_service_km != null && vehicle.current_km != null && vehicle.current_km >= vehicle.next_service_km

  return (
    <div className="space-y-6">
      <PageHeader
        title={vehicle.registration_number}
        description="Vehicle details, assignments, and related trip activity."
        actions={
          <div className="flex items-center gap-3">
            {serviceDue ? (
              <Badge variant="destructive" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Service due
              </Badge>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/vehicles/${vehicle.id}/edit`}>Edit vehicle</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card >
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Make / Model:</span> {[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</div>
            <div><span className="font-medium text-foreground">Branch:</span> {vehicle.branch_name ?? '-'}</div>
            <div><span className="font-medium text-foreground">Year:</span> {vehicle.year ?? '-'}</div>
            <div><span className="font-medium text-foreground">Fuel Type:</span> {vehicle.fuel_type ?? '-'}</div>
            <div><span className="font-medium text-foreground">Current KM:</span> {toDisplayNumber(vehicle.current_km)} km</div>
            <div><span className="font-medium text-foreground">Next Service KM:</span> {vehicle.next_service_km ? `${toDisplayNumber(vehicle.next_service_km)} km` : '-'}</div>
            <div><span className="font-medium text-foreground">Status:</span> {vehicle.is_active ? 'Active' : 'Inactive'}</div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card >
            <CardHeader>
              <CardTitle>Assigned Orders</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><Link href={`/orders/${order.id}`}>{order.order_number}</Link></TableCell>
                      <TableCell>{order.branch_name ?? '-'}</TableCell>
                      <TableCell>{order.pickup_location}</TableCell>
                      <TableCell>{order.delivery_location}</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card >
            <CardHeader>
              <CardTitle>Related Trips</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Branch</TableHead>
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
                      <TableCell>{trip.branch_name ?? '-'}</TableCell>
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

          <Card >
            <CardHeader>
              <CardTitle>Revenue Contribution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Estimated revenue by vehicle based on invoiced trips: <span className="font-semibold text-foreground">{formatCurrency(revenue)}</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Maintenance Log</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {maintenanceLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No maintenance records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>KM at Service</TableHead>
                  <TableHead>Next Service KM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.performed_at)}</TableCell>
                    <TableCell className="font-medium">{log.type}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.description ?? '-'}</TableCell>
                    <TableCell>{log.km_at_service != null ? `${toDisplayNumber(log.km_at_service)} km` : '-'}</TableCell>
                    <TableCell>{log.next_service_km != null ? `${toDisplayNumber(log.next_service_km)} km` : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
