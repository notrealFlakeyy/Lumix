import { Session } from '@supabase/supabase-js'

import { mobileEnv } from '@/src/lib/env'
import type {
  MobileCheckpointMutationResponse,
  MobileDocumentsResponse,
  MobileHomeResponse,
  MobileMeResponse,
  MobileTimeEntryMutationResponse,
  MobileTimeSummaryResponse,
  MobileTripDetailResponse,
  MobileTripMutationResponse,
  MobileTripsResponse,
} from '@/src/types/mobile'

type ApiOptions = {
  method?: 'GET' | 'POST'
  session: Session
  companyId?: string | null
  body?: unknown
}

type MobileApiResponse<T> = T & { error?: string }

async function request<T>(path: string, options: ApiOptions): Promise<T> {
  const response = await fetch(`${mobileEnv.apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.session.access_token}`,
      ...(options.companyId ? { 'x-company-id': options.companyId } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const json = (await response.json()) as MobileApiResponse<T>

  if (!response.ok || ('error' in json && json.error)) {
    throw new Error(json.error ?? 'Mobile API request failed.')
  }

  return json as T
}

export const mobileApi = {
  me(session: Session, companyId?: string | null) {
    return request<MobileMeResponse>('/api/mobile/v1/me', { session, companyId })
  },
  home(session: Session, companyId?: string | null) {
    return request<MobileHomeResponse>('/api/mobile/v1/home', { session, companyId })
  },
  trips(session: Session, companyId?: string | null) {
    return request<MobileTripsResponse>('/api/mobile/v1/trips', { session, companyId })
  },
  tripDetail(session: Session, routeId: string, companyId?: string | null) {
    return request<MobileTripDetailResponse>(`/api/mobile/v1/trips/${routeId}`, { session, companyId })
  },
  documents(session: Session, companyId?: string | null) {
    return request<MobileDocumentsResponse>('/api/mobile/v1/documents', { session, companyId })
  },
  timeSummary(session: Session, companyId?: string | null) {
    return request<MobileTimeSummaryResponse>('/api/mobile/v1/time/summary', { session, companyId })
  },
  startTrip(session: Session, routeId: string, body: { start_km?: number | null; notes?: string | null }, companyId?: string | null) {
    return request<MobileTripMutationResponse>(`/api/mobile/v1/trips/${routeId}/start`, {
      method: 'POST',
      session,
      companyId,
      body,
    })
  },
  completeTrip(
    session: Session,
    routeId: string,
    body: { end_km?: number | null; waiting_time_minutes?: number; delivery_confirmation?: string | null; notes?: string | null },
    companyId?: string | null,
  ) {
    return request<MobileTripMutationResponse>(`/api/mobile/v1/trips/${routeId}/complete`, {
      method: 'POST',
      session,
      companyId,
      body,
    })
  },
  checkpoint(
    session: Session,
    routeId: string,
    body: {
      checkpoint_type: 'arrived_pickup' | 'departed_pickup' | 'arrived_delivery' | 'delivered'
      latitude: number
      longitude: number
      accuracy_meters?: number | null
      notes?: string | null
    },
    companyId?: string | null,
  ) {
    return request<MobileCheckpointMutationResponse>(`/api/mobile/v1/trips/${routeId}/checkpoint`, {
      method: 'POST',
      session,
      companyId,
      body,
    })
  },
  clockIn(session: Session, companyId?: string | null) {
    return request<MobileTimeEntryMutationResponse>('/api/mobile/v1/shift/clock-in', {
      method: 'POST',
      session,
      companyId,
      body: {},
    })
  },
  clockOut(session: Session, body: { break_minutes?: number; notes?: string | null }, companyId?: string | null) {
    return request<MobileTimeEntryMutationResponse>('/api/mobile/v1/shift/clock-out', {
      method: 'POST',
      session,
      companyId,
      body,
    })
  },
}
