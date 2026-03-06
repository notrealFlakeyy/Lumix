import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/dates'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { TripStatusBadge } from '@/components/trips/trip-status-badge'

export function TripTable({
  trips,
}: {
  trips: Array<{
    id: string
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Trip ID</TableHead>
          <TableHead>Customer</TableHead>
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
          <TableRow key={trip.id}>
            <TableCell className="font-medium">
              <Link href={`/trips/${trip.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                {trip.id.slice(0, 8).toUpperCase()}
              </Link>
            </TableCell>
            <TableCell>{trip.customer_name}</TableCell>
            <TableCell>{trip.vehicle_name}</TableCell>
            <TableCell>{trip.driver_name}</TableCell>
            <TableCell>{formatDateTime(trip.start_time)}</TableCell>
            <TableCell>{formatDateTime(trip.end_time)}</TableCell>
            <TableCell>{trip.distance_km ? `${toDisplayNumber(trip.distance_km, 0)} km` : '-'}</TableCell>
            <TableCell>{trip.waiting_time_minutes} min</TableCell>
            <TableCell>
              <TripStatusBadge status={trip.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
