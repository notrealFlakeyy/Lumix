import type { TimeEntryStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

const statusVariant: Record<TimeEntryStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  open: 'warning',
  submitted: 'warning',
  approved: 'success',
  exported: 'default',
}

export function TimeEntryStatusBadge({ status }: { status: TimeEntryStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace('_', ' ')}</Badge>
}
