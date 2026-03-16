'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MapPinned } from 'lucide-react'

import { enqueueDriverOfflineAction } from '@/lib/driver/offline-queue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const checkpointDefinitions = [
  { key: 'arrived_pickup', label: 'Arrived pickup' },
  { key: 'departed_pickup', label: 'Departed pickup' },
  { key: 'arrived_delivery', label: 'Arrived delivery' },
  { key: 'delivered', label: 'Delivered' },
] as const

type CheckpointKey = (typeof checkpointDefinitions)[number]['key']

export function DriverCheckpointPanel({
  tripId,
  existingCheckpointTypes,
}: {
  tripId: string
  existingCheckpointTypes: readonly string[]
}) {
  const router = useRouter()
  const [notes, setNotes] = React.useState('')
  const [isLoading, setIsLoading] = React.useState<CheckpointKey | null>(null)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function captureCheckpoint(type: CheckpointKey) {
    setMessage(null)
    setError(null)
    setIsLoading(type)

    const getPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('Geolocation is not available on this device.'))
          return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        })
      })

    try {
      const position = await getPosition()
      const payload = {
        checkpoint_type: type,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_meters: position.coords.accuracy,
        notes: notes || null,
      }

      if (!navigator.onLine) {
        enqueueDriverOfflineAction({
          endpoint: `/api/driver/trips/${tripId}/checkpoint`,
          type: 'trip_checkpoint',
          payload,
        })
        setMessage(`${checkpointDefinitions.find((item) => item.key === type)?.label} queued with location stamp. It will sync automatically when the connection returns.`)
        return
      }

      const response = await fetch(`/api/driver/trips/${tripId}/checkpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error ?? 'Unable to capture checkpoint.')
        return
      }

      setMessage(`${checkpointDefinitions.find((item) => item.key === type)?.label} captured successfully.`)
      setNotes('')
      router.refresh()
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Unable to capture geolocation.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
      <CardHeader className="pb-4">
        <CardTitle>Live location stamps</CardTitle>
        <CardDescription>Capture arrival and departure checkpoints with GPS location from the driver phone.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{message}</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">{error}</div> : null}

        <div className="space-y-2">
          <Label htmlFor="checkpoint_notes">Checkpoint note</Label>
          <Input
            id="checkpoint_notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Gate queue, receiver on site, unloading started..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {checkpointDefinitions.map((checkpoint) => {
            const isCaptured = existingCheckpointTypes.includes(checkpoint.key)
            return (
              <Button
                key={checkpoint.key}
                type="button"
                variant={isCaptured ? 'outline' : 'default'}
                className="h-auto min-h-14 justify-start gap-2 whitespace-normal text-left"
                disabled={isLoading !== null}
                onClick={() => captureCheckpoint(checkpoint.key)}
              >
                <MapPinned className="h-4 w-4 shrink-0" />
                <span>{isLoading === checkpoint.key ? 'Capturing...' : checkpoint.label}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
