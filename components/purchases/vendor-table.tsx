import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export function PurchaseVendorTable({
  vendors,
}: {
  vendors: Array<{
    id: string
    name: string
    branch_name: string
    business_id: string | null
    email: string | null
    phone: string | null
    invoice_count: number
    is_active: boolean
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
          <TableHead>Bills</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => (
          <TableRow key={vendor.id}>
            <TableCell className="font-medium">{vendor.name}</TableCell>
            <TableCell>{vendor.branch_name}</TableCell>
            <TableCell>{vendor.business_id ?? '-'}</TableCell>
            <TableCell>{vendor.email ?? '-'}</TableCell>
            <TableCell>{vendor.phone ?? '-'}</TableCell>
            <TableCell>{vendor.invoice_count}</TableCell>
            <TableCell>
              <Badge variant={vendor.is_active ? 'success' : 'default'}>
                {vendor.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
