import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations()

  const variant =
    status === 'paid' || status === 'approved'
      ? 'success'
      : status === 'overdue'
        ? 'warning'
        : status === 'rejected' || status === 'void'
          ? 'destructive'
          : 'default'

  const key = `status.${status}` as const

  return <Badge variant={variant as any}>{t(key)}</Badge>
}

