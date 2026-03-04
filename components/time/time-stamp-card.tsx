'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type TimeEntry = {
  id: string
  start_time: string
  end_time: string | null
  minutes: number
}

export function TimeStampCard({ active }: { active: TimeEntry | null }) {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onAction = async (endpoint: string) => {
    setError(null)
    setIsLoading(true)
    const tz = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        return null
      }
    })()

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientNow: new Date().toISOString(),
        timeZone: tz,
      }),
    }).catch(() => null)
    setIsLoading(false)

    if (!res || !res.ok) {
      setError(t('errors.unexpected'))
      return
    }

    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.time.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {active ? t('payroll.time.active') : t('payroll.time.inactive')}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onAction('/api/time/clock-in')} disabled={isLoading || Boolean(active)}>
            {t('payroll.time.clockIn')}
          </Button>
          <Button variant="outline" onClick={() => onAction('/api/time/clock-out')} disabled={isLoading || !active}>
            {t('payroll.time.clockOut')}
          </Button>
        </div>
        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-foreground" role="alert">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
