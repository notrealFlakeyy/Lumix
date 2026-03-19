'use client'

import * as React from 'react'
import * as Sentry from '@sentry/nextjs'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonitoringTestPanel({
  enabled,
}: {
  enabled: boolean
}) {
  const [clientStatus, setClientStatus] = React.useState<string | null>(null)
  const [serverStatus, setServerStatus] = React.useState<{ status: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = React.useTransition()

  return (
    <Card >
      <CardHeader>
        <CardTitle>Monitoring Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>Use these controls after deployment to verify that Sentry receives both server-side and client-side events for the active environment.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!enabled || isPending}
            onClick={() => {
              startTransition(async () => {
                const response = await fetch('/api/monitoring/test/server', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                })
                const result = (await response.json()) as { status: 'success' | 'error'; message: string }
                setServerStatus(result)
                window.setTimeout(() => setServerStatus(null), 3000)
              })
            }}
          >
            {isPending ? 'Sending server test...' : 'Send server test event'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!enabled}
            onClick={() => {
              void (async () => {
                Sentry.withScope((scope) => {
                  scope.setTag('manual_test', 'client')
                  Sentry.captureMessage('Manual client-side monitoring test from Settings', 'info')
                })

                await Sentry.flush(2000)

                setClientStatus('Client test event sent.')
                window.setTimeout(() => setClientStatus(null), 2500)
              })()
            }}
          >
            Send client test event
          </Button>
        </div>
        {!enabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            Configure <code>NEXT_PUBLIC_SENTRY_DSN</code> before using the monitoring test controls.
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          Alert rules still need to be configured in the Sentry dashboard. These buttons only confirm event ingestion.
        </div>
        {serverStatus ? (
          <div
            className={
              serverStatus.status === 'success'
                ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950'
                : 'rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-950'
            }
          >
            {serverStatus.message}
          </div>
        ) : null}
        {clientStatus ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">{clientStatus}</div> : null}
      </CardContent>
    </Card>
  )
}
