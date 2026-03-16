'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { enqueueDriverOfflineAction } from '@/lib/driver/offline-queue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type DriverTripActionPanelProps = {
  tripId: string
  status: 'planned' | 'started' | 'completed' | 'invoiced'
  hasOpenShift: boolean
  allowCombinedShiftStart: boolean
  defaultWaitingMinutes: number
  defaultNotes?: string | null
}

export function DriverTripActionPanel({
  tripId,
  status,
  hasOpenShift,
  allowCombinedShiftStart,
  defaultWaitingMinutes,
  defaultNotes,
}: DriverTripActionPanelProps) {
  const router = useRouter()
  const [startKm, setStartKm] = React.useState('')
  const [startNotes, setStartNotes] = React.useState('')
  const [endKm, setEndKm] = React.useState('')
  const [waitingTimeMinutes, setWaitingTimeMinutes] = React.useState(String(defaultWaitingMinutes ?? 0))
  const [deliveryConfirmation, setDeliveryConfirmation] = React.useState('')
  const [completeNotes, setCompleteNotes] = React.useState(defaultNotes ?? '')
  const [isLoading, setIsLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function sendOrQueue(options: {
    endpoint: string
    type: 'clock_in' | 'clock_out' | 'trip_start' | 'trip_complete'
    payload: Record<string, unknown>
    onlineSuccess: string
    offlineSuccess: string
  }) {
    setError(null)
    setMessage(null)

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
    <>
      {status === 'planned' ? (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>Start trip</CardTitle>
            <CardDescription>Capture the starting odometer and a short dispatch note before departure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">{message}</div> : null}
            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">{error}</div> : null}
            <div className="space-y-2">
              <Label htmlFor="start_km">Start odometer (km)</Label>
              <Input id="start_km" inputMode="decimal" placeholder="182450" value={startKm} onChange={(event) => setStartKm(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_notes">Kickoff note</Label>
              <Textarea id="start_notes" value={startNotes} onChange={(event) => setStartNotes(event.target.value)} placeholder="Loaded, vehicle checked, leaving terminal now." />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={() =>
                sendOrQueue({
                  endpoint: `/api/driver/trips/${tripId}/start`,
                  type: 'trip_start',
                  payload: {
                    start_km: startKm ? Number(startKm) : null,
                    notes: startNotes || null,
                  },
                  onlineSuccess: 'Trip started successfully.',
                  offlineSuccess: 'Trip start queued. It will sync automatically when the connection returns.',
                })
              }
            >
              {isLoading ? 'Saving...' : 'Start trip'}
            </Button>

            {allowCombinedShiftStart && !hasOpenShift ? (
              <>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-950">
                  No active shift is open. The combined action will queue both the shift clock-in and the trip start if the device is offline.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={async () => {
                    setError(null)
                    setMessage(null)

                    const online = typeof navigator === 'undefined' ? true : navigator.onLine
                    if (!online) {
                      enqueueDriverOfflineAction({ endpoint: '/api/driver/shift/clock-in', type: 'clock_in', payload: {} })
                      enqueueDriverOfflineAction({
                        endpoint: `/api/driver/trips/${tripId}/start`,
                        type: 'trip_start',
                        payload: {
                          start_km: startKm ? Number(startKm) : null,
                          notes: startNotes || null,
                        },
                      })
                      setMessage('Shift clock-in and trip start queued together.')
                      return
                    }

                    setIsLoading(true)
                    try {
                      const clockInResponse = await fetch('/api/driver/shift/clock-in', { method: 'POST' })
                      const clockInResult = await clockInResponse.json().catch(() => null)
                      if (!clockInResponse.ok) {
                        setError(clockInResult?.error ?? 'Unable to start shift.')
                        return
                      }

                      const tripResponse = await fetch(`/api/driver/trips/${tripId}/start`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          start_km: startKm ? Number(startKm) : null,
                          notes: startNotes || null,
                        }),
                      })
                      const tripResult = await tripResponse.json().catch(() => null)
                      if (!tripResponse.ok) {
                        setError(tripResult?.error ?? 'Unable to start trip.')
                        return
                      }

                      setMessage('Shift and trip started successfully.')
                      router.refresh()
                    } catch {
                      enqueueDriverOfflineAction({ endpoint: '/api/driver/shift/clock-in', type: 'clock_in', payload: {} })
                      enqueueDriverOfflineAction({
                        endpoint: `/api/driver/trips/${tripId}/start`,
                        type: 'trip_start',
                        payload: {
                          start_km: startKm ? Number(startKm) : null,
                          notes: startNotes || null,
                        },
                      })
                      setMessage('Shift clock-in and trip start queued together.')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                >
                  {isLoading ? 'Saving...' : 'Start shift + trip'}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {status === 'started' ? (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>Complete trip</CardTitle>
            <CardDescription>Record the delivery confirmation, final odometer, and any wait time from the field.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">{message}</div> : null}
            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">{error}</div> : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="end_km">End odometer</Label>
                <Input id="end_km" inputMode="decimal" placeholder="182870" value={endKm} onChange={(event) => setEndKm(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waiting_time_minutes">Waiting min</Label>
                <Input id="waiting_time_minutes" inputMode="numeric" value={waitingTimeMinutes} onChange={(event) => setWaitingTimeMinutes(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_confirmation">Delivery confirmation</Label>
              <Input id="delivery_confirmation" value={deliveryConfirmation} onChange={(event) => setDeliveryConfirmation(event.target.value)} placeholder="Signed by warehouse contact" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete_notes">Driver note</Label>
              <Textarea id="complete_notes" value={completeNotes} onChange={(event) => setCompleteNotes(event.target.value)} placeholder="Queue time, unloading notes, route issues." />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={isLoading}
              onClick={() =>
                sendOrQueue({
                  endpoint: `/api/driver/trips/${tripId}/complete`,
                  type: 'trip_complete',
                  payload: {
                    end_km: endKm ? Number(endKm) : null,
                    waiting_time_minutes: waitingTimeMinutes ? Number(waitingTimeMinutes) : 0,
                    delivery_confirmation: deliveryConfirmation || null,
                    notes: completeNotes || null,
                  },
                  onlineSuccess: 'Trip completed successfully.',
                  offlineSuccess: 'Trip completion queued. It will sync automatically when the connection returns.',
                })
              }
            >
              {isLoading ? 'Saving...' : 'Complete trip'}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </>
  )
}
