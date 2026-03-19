import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getDriverRouteId } from '@/lib/utils/public-ids'

export function DriverTable({
  drivers,
}: {
  drivers: Array<{
    id: string
    public_id?: string | null
    full_name: string
    branch_name?: string | null
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
          <TableHead>Branch</TableHead>
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
            <TableCell className="max-w-[180px] font-medium">
              <Link href={`/drivers/${getDriverRouteId(driver)}`} className="block truncate text-foreground no-underline hover:text-[rgb(var(--app-accent))]">
                {driver.full_name}
              </Link>
            </TableCell>
            <TableCell>{driver.branch_name ?? '—'}</TableCell>
            <TableCell>{driver.phone ?? '—'}</TableCell>
            <TableCell className="max-w-[180px]">
              <span className="block truncate">{driver.email ?? '—'}</span>
            </TableCell>
            <TableCell>{driver.license_type ?? '—'}</TableCell>
            <TableCell>{driver.employment_type ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={driver.is_active ? 'success' : 'warning'}>{driver.is_active ? 'Active' : 'Inactive'}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
