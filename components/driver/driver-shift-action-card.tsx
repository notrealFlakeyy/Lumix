'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Clock3 } from 'lucide-react'

import { enqueueDriverOfflineAction } from '@/lib/driver/offline-queue'
import { formatDateTime } from '@/lib/utils/dates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimeEntryStatusBadge } from '@/components/time/time-entry-status-badge'

export function DriverShiftActionCard({
  openEntry,
  readOnly = false,
}: {
  openEntry:
    | {
        id: string
        start_time: string
        status: string
      }
    | null
  readOnly?: boolean
}) {
  const router = useRouter()
  const [breakMinutes, setBreakMinutes] = React.useState('30')
  const [notes, setNotes] = React.useState('')
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function sendOrQueue(options: {
    endpoint: string
    type: 'clock_in' | 'clock_out'
    payload: Record<string, unknown>
    onlineSuccess: string
    offlineSuccess: string
  }) {
    setError(null)
    setMessage(null)

    if (readOnly) {
      setError('Preview mode is read-only for shift clocking.')
      return
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueDriverOfflineAction({
        endpoint: options.endpoint,
        type: options.type,
        payload: options.payload,
      })
      setMessage(options.offlineSuccess)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options.payload),
      })
      const result = await response.json().catch(() => null)

      if (!response.ok) {
        setError(result?.error ?? 'Unable to complete the action.')
        return
      }

      setMessage(options.onlineSuccess)
      router.refresh()
    } catch {
      enqueueDriverOfflineAction({
        endpoint: options.endpoint,
        type: options.type,
        payload: options.payload,
      })
      setMessage(options.offlineSuccess)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-softSm">
      <CardHeader className="pb-4">
        <CardTitle>{openEntry ? 'Clock out' : 'Clock in'}</CardTitle>
        <CardDescription>
          {readOnly
            ? 'Preview mode shows the shift state but does not allow clocking on behalf of another employee.'
            : openEntry
              ? 'Finish the field shift with break minutes and an end-of-day note.'
              : 'Start the workday before beginning dispatch, loading, or delivery work.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {openEntry ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <div className="flex items-center gap-2 font-medium">
              <Clock3 className="h-4 w-4" />
              Live since {formatDateTime(openEntry.start_time)}
            </div>
            <div className="mt-2">
              Status: <TimeEntryStatusBadge status={openEntry.status as any} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
            No active shift. Clock in before the day starts so payroll and operations reporting stay aligned.
          </div>
        )}

        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">{message}</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">{error}</div> : null}

        {openEntry ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="break_minutes">Break minutes</Label>
              <Input id="break_minutes" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} type="number" min="0" step="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Shift note</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Loading delay, waiting time, route issue, extra work..." />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={() =>
                sendOrQueue({
                  endpoint: '/api/driver/shift/clock-out',
                  type: 'clock_out',
                  payload: {
                    break_minutes: Number(breakMinutes || 0),
                    notes,
                  },
                  onlineSuccess: 'Shift submitted for approval.',
                  offlineSuccess: 'Shift clock-out queued. It will sync automatically when the connection returns.',
                })
              }
            >
              {isLoading ? 'Saving...' : 'Clock out'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={isLoading}
            onClick={() =>
              sendOrQueue({
                endpoint: '/api/driver/shift/clock-in',
                type: 'clock_in',
                payload: {},
                onlineSuccess: 'Shift started successfully.',
                offlineSuccess: 'Shift clock-in queued. It will sync automatically when the connection returns.',
              })
            }
          >
            {isLoading ? 'Saving...' : 'Clock in'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
