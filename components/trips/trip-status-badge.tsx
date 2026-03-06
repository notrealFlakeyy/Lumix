import type { TripStatus } from '@/types/app'
import { Badge } from '@/components/ui/badge'

const statusVariant: Record<TripStatus, 'default' | 'success' | 'warning' | 'destructive'> = {
  planned: 'warning',
  started: 'success',
  completed: 'default',
  invoiced: 'default',
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>
}
