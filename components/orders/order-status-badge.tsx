import type { OrderStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

const statusVariant: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  draft: 'default',
  planned: 'warning',
  assigned: 'warning',
  in_progress: 'success',
  completed: 'success',
  invoiced: 'default',
  cancelled: 'destructive',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace('_', ' ')}</Badge>
}
