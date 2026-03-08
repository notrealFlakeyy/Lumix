'use client'

import * as React from 'react'
import * as Sentry from '@sentry/nextjs'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function MonitoringTestPanel({
  serverAction,
  enabled,
}: {
  serverAction: () => Promise<void>
  enabled: boolean
}) {
  const [clientStatus, setClientStatus] = React.useState<string | null>(null)

  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader>
        <CardTitle>Monitoring Tests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-600">
        <p>Use these controls after deployment to verify that Sentry receives both server-side and client-side events for the active environment.</p>
        <div className="flex flex-wrap gap-2">
          <form action={serverAction}>
            <Button type="submit" variant="outline" disabled={!enabled}>
              Send server test event
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            disabled={!enabled}
            onClick={() => {
              Sentry.captureException(new Error('Manual client-side monitoring test from Settings'))
              setClientStatus('Client test event sent.')
              window.setTimeout(() => setClientStatus(null), 2500)
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
        {clientStatus ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">{clientStatus}</div> : null}
      </CardContent>
    </Card>
  )
}
