import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TimeEntryStatusBadge } from '@/components/time/time-entry-status-badge'
import { formatDateTime } from '@/lib/utils/dates'
import { formatMinutesAsHours } from '@/lib/utils/workforce'

export function TimeEntryTable({
  entries,
  approveAction,
  canApprove,
}: {
  entries: Array<{
    id: string
    employee_name: string
    branch_name: string
    work_date: string
    start_time: string
    end_time: string | null
    regular_minutes: number
    overtime_minutes: number
    status: string
    source: string
    notes: string | null
    payroll_period_label: string | null
  }>
  approveAction?: (formData: FormData) => void | Promise<void>
  canApprove?: boolean
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Hours</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Payroll</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-medium">{entry.employee_name}</TableCell>
            <TableCell>{entry.branch_name}</TableCell>
            <TableCell>{formatDateTime(entry.start_time)}</TableCell>
            <TableCell>{entry.end_time ? formatDateTime(entry.end_time) : '-'}</TableCell>
            <TableCell>{formatMinutesAsHours(entry.regular_minutes + entry.overtime_minutes)}</TableCell>
            <TableCell><TimeEntryStatusBadge status={entry.status as any} /></TableCell>
            <TableCell>{entry.source}</TableCell>
            <TableCell>{entry.payroll_period_label ?? '-'}</TableCell>
            <TableCell>
              {canApprove && approveAction && entry.status === 'submitted' ? (
                <form action={approveAction}>
                  <input type="hidden" name="time_entry_id" value={entry.id} />
                  <Button type="submit" variant="outline" size="sm">Approve</Button>
                </form>
              ) : (
                '-'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
