import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function DriverTable({
  drivers,
}: {
  drivers: Array<{
    id: string
    full_name: string
    phone: string | null
    email: string | null
    license_type: string | null
    employment_type: string | null
    is_active: boolean
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>License Type</TableHead>
          <TableHead>Employment Type</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {drivers.map((driver) => (
          <TableRow key={driver.id}>
            <TableCell className="font-medium">
              <Link href={`/drivers/${driver.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                {driver.full_name}
              </Link>
            </TableCell>
            <TableCell>{driver.phone ?? '-'}</TableCell>
            <TableCell>{driver.email ?? '-'}</TableCell>
            <TableCell>{driver.license_type ?? '-'}</TableCell>
            <TableCell>{driver.employment_type ?? '-'}</TableCell>
            <TableCell>
              <Badge variant={driver.is_active ? 'success' : 'warning'}>{driver.is_active ? 'Active' : 'Inactive'}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
