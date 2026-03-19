'use client'

import * as React from 'react'
import { CloudOff, RefreshCcw, Wifi } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  getDriverOfflineQueueEventName,
  readDriverOfflineQueue,
  syncDriverOfflineQueue,
} from '@/lib/driver/offline-queue'

export function DriverOfflineSync() {
  const [isOnline, setIsOnline] = React.useState(true)
  const [pendingCount, setPendingCount] = React.useState(0)
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const updateState = () => {
      setIsOnline(window.navigator.onLine)
      setPendingCount(readDriverOfflineQueue().length)
    }

    const syncWhenOnline = async () => {
      updateState()
      if (!window.navigator.onLine || readDriverOfflineQueue().length === 0) return
      setIsSyncing(true)
      const result = await syncDriverOfflineQueue()
      setIsSyncing(false)
      setPendingCount(result.remaining)
      if (result.processed > 0) {
        setMessage(`${result.processed} queued action${result.processed === 1 ? '' : 's'} synced.`)
      } else if (result.failures.length > 0) {
        setMessage(result.failures[0]?.message ?? 'Some queued actions could not be synced.')
      }
    }

    updateState()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/driver-sw.js').catch(() => null)
    }

    window.addEventListener('online', syncWhenOnline)
    window.addEventListener('offline', updateState)
    window.addEventListener(getDriverOfflineQueueEventName(), updateState as EventListener)

    return () => {
      window.removeEventListener('online', syncWhenOnline)
      window.removeEventListener('offline', updateState)
      window.removeEventListener(getDriverOfflineQueueEventName(), updateState as EventListener)
    }
  }, [])

  async function handleManualSync() {
    setIsSyncing(true)
    const result = await syncDriverOfflineQueue()
    setIsSyncing(false)
    setPendingCount(result.remaining)
    if (result.processed > 0) {
      setMessage(`${result.processed} queued action${result.processed === 1 ? '' : 's'} synced.`)
    } else if (result.failures.length > 0) {
      setMessage(result.failures[0]?.message ?? 'Queued actions could not be synced.')
    } else {
      setMessage('No queued actions waiting to sync.')
    }
  }

  if (isOnline && pendingCount === 0 && !message) {
    return null
  }

  return (
    <Card className="shadow-softSm">
      <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[rgb(var(--app-surface-2))] p-2 text-muted-foreground">
            {isOnline ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground">{isOnline ? 'Connection active' : 'Offline mode active'}</div>
            <div className="mt-1">
              {isOnline
                ? pendingCount > 0
                  ? `${pendingCount} action${pendingCount === 1 ? '' : 's'} queued and ready to sync.`
                  : 'Live field actions are available.'
                : 'Trip and shift actions will be queued and synced when the device reconnects. Document uploads still require connectivity.'}
            </div>
          </div>
        </div>

        {message ? <div className="rounded-xl border border-border/20 bg-[rgb(var(--app-surface))] px-3 py-2 text-muted-foreground">{message}</div> : null}

        {isOnline && pendingCount > 0 ? (
          <Button type="button" variant="outline" className="w-full" onClick={handleManualSync} disabled={isSyncing}>
            <RefreshCcw className="h-4 w-4" />
            <span>{isSyncing ? 'Syncing queued actions...' : 'Sync queued actions'}</span>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
