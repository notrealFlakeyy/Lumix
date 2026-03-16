import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PayrollRunStatusBadge } from '@/components/payroll/payroll-run-status-badge'
import { Link } from '@/i18n/navigation'
import { formatCurrency } from '@/lib/utils/currency'
import { formatMinutesAsHours } from '@/lib/utils/workforce'

export function PayrollRunTable({
  runs,
}: {
  runs: Array<{
    id: string
    period_start: string
    period_end: string
    branch_name: string
    status: string
    total_regular_minutes: number
    total_overtime_minutes: number
    gross_total: number
    employee_count: number
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Employees</TableHead>
          <TableHead>Hours</TableHead>
          <TableHead>Estimated gross</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Open</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell className="font-medium">{`${run.period_start} -> ${run.period_end}`}</TableCell>
            <TableCell>{run.branch_name}</TableCell>
            <TableCell>{run.employee_count}</TableCell>
            <TableCell>{formatMinutesAsHours(run.total_regular_minutes + run.total_overtime_minutes)}</TableCell>
            <TableCell>{formatCurrency(run.gross_total)}</TableCell>
            <TableCell><PayrollRunStatusBadge status={run.status as any} /></TableCell>
            <TableCell>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/payroll/runs/${run.id}`}>View</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
