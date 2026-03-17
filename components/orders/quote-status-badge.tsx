import type { QuoteStatus } from '@/types/app'

import { Badge } from '@/components/ui/badge'

const variantByStatus: Record<QuoteStatus, Parameters<typeof Badge>[0]['variant']> = {
  draft: 'default',
  sent: 'warning',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'destructive',
}

const labelByStatus: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Badge variant={variantByStatus[status]}>{labelByStatus[status]}</Badge>
}
