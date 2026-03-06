import type { InvoiceStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

const statusVariant: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  sent: 'warning',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'destructive',
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace('_', ' ')}</Badge>
}
