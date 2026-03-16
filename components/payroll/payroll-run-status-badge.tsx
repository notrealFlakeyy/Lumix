import type { PayrollRunStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

const statusVariant: Record<PayrollRunStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'warning',
  reviewed: 'default',
  exported: 'success',
  finalized: 'success',
}

export function PayrollRunStatusBadge({ status }: { status: PayrollRunStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace('_', ' ')}</Badge>
}
