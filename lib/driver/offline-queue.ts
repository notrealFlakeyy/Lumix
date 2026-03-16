'use client'

export type DriverOfflineActionType = 'clock_in' | 'clock_out' | 'trip_start' | 'trip_complete' | 'trip_checkpoint'

export type DriverOfflineQueueItem = {
  id: string
  type: DriverOfflineActionType
  endpoint: string
  payload: Record<string, unknown>
  createdAt: string
}

const storageKey = 'lumix_driver_offline_queue_v1'
const updateEventName = 'lumix:driver-offline-queue-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emitUpdate() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(updateEventName))
}

export function getDriverOfflineQueueEventName() {
  return updateEventName
}

export function readDriverOfflineQueue(): DriverOfflineQueueItem[] {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as DriverOfflineQueueItem[]) : []
  } catch {
    return []
  }
}

function writeDriverOfflineQueue(items: DriverOfflineQueueItem[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(storageKey, JSON.stringify(items))
  emitUpdate()
}

export function enqueueDriverOfflineAction(
  input: Omit<DriverOfflineQueueItem, 'id' | 'createdAt'>,
) {
  const current = readDriverOfflineQueue()
  const next: DriverOfflineQueueItem = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  }
  writeDriverOfflineQueue([...current, next])
  return next
}

export async function syncDriverOfflineQueue() {
  const current = readDriverOfflineQueue()
  const failures: Array<{ item: DriverOfflineQueueItem; message: string }> = []
  let processed = 0

  if (current.length === 0) {
    return { processed, remaining: 0, failures }
  }

  const remaining: DriverOfflineQueueItem[] = []

  for (const item of current) {
    try {
      const response = await fetch(item.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.payload),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        failures.push({ item, message: result?.error ?? `Request failed with status ${response.status}` })
        continue
      }

      processed += 1
    } catch (error) {
      remaining.push(item, ...current.slice(current.indexOf(item) + 1))
      writeDriverOfflineQueue(remaining)
      return {
        processed,
        remaining: remaining.length,
        failures,
      }
    }
  }

  writeDriverOfflineQueue(remaining)
  return {
    processed,
    remaining: remaining.length,
    failures,
  }
}
