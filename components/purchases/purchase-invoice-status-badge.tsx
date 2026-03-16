import { Badge } from '@/components/ui/badge'

export function PurchaseInvoiceStatusBadge({ status }: { status: string }) {
  if (status === 'paid') {
    return <Badge variant="success">paid</Badge>
  }
  if (status === 'partially_paid') {
    return <Badge variant="warning">partially paid</Badge>
  }
  if (status === 'cancelled') {
    return <Badge variant="destructive">cancelled</Badge>
  }
  if (status === 'approved') {
    return <Badge variant="default">approved</Badge>
  }
  return <Badge variant="default">draft</Badge>
}
