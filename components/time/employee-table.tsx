import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export function WorkforceEmployeeTable({
  employees,
}: {
  employees: Array<{
    id: string
    full_name: string
    branch_name: string
    job_title: string | null
    pay_type: string
    hourly_rate: string
    auth_user_id: string | null
    is_active: boolean
    has_open_entry: boolean
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Pay type</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Login link</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell className="font-medium">{employee.full_name}</TableCell>
            <TableCell>{employee.branch_name}</TableCell>
            <TableCell>{employee.job_title ?? '-'}</TableCell>
            <TableCell>{employee.pay_type}</TableCell>
            <TableCell>{formatCurrency(Number(employee.hourly_rate))}</TableCell>
            <TableCell>{employee.auth_user_id ? <Badge variant="success">linked</Badge> : <Badge variant="warning">unlinked</Badge>}</TableCell>
            <TableCell>
              {!employee.is_active ? <Badge variant="destructive">inactive</Badge> : employee.has_open_entry ? <Badge variant="warning">clocked in</Badge> : <Badge variant="success">ready</Badge>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
