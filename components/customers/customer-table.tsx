import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/dates'

export function CustomerTable({
  customers,
}: {
  customers: Array<{
    id: string
    name: string
    branch_name?: string | null
    business_id: string | null
    email: string | null
    phone: string | null
    billing_city: string | null
    created_at: string
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Business ID</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>City</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">
              <Link href={`/customers/${customer.id}`} className="text-slate-950 no-underline hover:text-sky-700">
                {customer.name}
              </Link>
            </TableCell>
            <TableCell>{customer.branch_name ?? '-'}</TableCell>
            <TableCell>{customer.business_id ?? '-'}</TableCell>
            <TableCell>{customer.email ?? '-'}</TableCell>
            <TableCell>{customer.phone ?? '-'}</TableCell>
            <TableCell>{customer.billing_city ?? '-'}</TableCell>
            <TableCell>{formatDate(customer.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
