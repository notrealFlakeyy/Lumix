import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toDisplayNumber } from '@/lib/utils/numbers'

export function VehicleTable({
  vehicles,
}: {
  vehicles: Array<{
    id: string
    branch_name?: string | null
    registration_number: string
    make: string | null
    model: string | null
    year: number | null
    fuel_type: string | null
    current_km: string
    next_service_km: string | null
    is_active: boolean
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Registration</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Make/Model</TableHead>
          <TableHead>Year</TableHead>
          <TableHead>Fuel Type</TableHead>
          <TableHead>Current KM</TableHead>
          <TableHead>Next Service KM</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => (
          <TableRow key={vehicle.id}>
            <TableCell className="font-medium">
              <Link href={`/vehicles/${vehicle.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                {vehicle.registration_number}
              </Link>
            </TableCell>
            <TableCell>{vehicle.branch_name ?? '—'}</TableCell>
            <TableCell>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'}</TableCell>
            <TableCell>{vehicle.year ?? '—'}</TableCell>
            <TableCell>{vehicle.fuel_type ?? '—'}</TableCell>
            <TableCell>{toDisplayNumber(vehicle.current_km)} km</TableCell>
            <TableCell>{vehicle.next_service_km ? `${toDisplayNumber(vehicle.next_service_km)} km` : '—'}</TableCell>
            <TableCell>
              <Badge variant={vehicle.is_active ? 'success' : 'warning'}>{vehicle.is_active ? 'Active' : 'Inactive'}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
