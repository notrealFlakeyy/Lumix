export type AppRole = 'owner' | 'admin' | 'dispatcher' | 'accountant' | 'driver' | 'viewer'

export type MobileCompany = {
  id: string
  name: string
  timezone: string
  country: string
}

export type MobileMembership = {
  company_id: string
  role: AppRole
  enabled_modules: string[]
  branch_ids: string[]
  has_restricted_branch_access: boolean
  company: MobileCompany
}

export type MobileDriver = {
  id: string
  public_id?: string | null
  route_id?: string
  auth_user_id?: string | null
  full_name: string
  email?: string | null
  phone?: string | null
  is_active?: boolean
}

export type MobileTrip = {
  id: string
  public_id: string
  route_id?: string
  company_id: string
  customer_id: string
  vehicle_id: string | null
  driver_id: string | null
  transport_order_id: string | null
  branch_id?: string | null
  status: 'planned' | 'started' | 'completed' | 'invoiced'
  start_time: string | null
  end_time: string | null
  start_km: number | string | null
  end_km: number | string | null
  distance_km: number | string | null
  waiting_time_minutes: number | string
  delivery_confirmation: string | null
  delivery_recipient_name?: string | null
  delivery_received_at?: string | null
  customer_name?: string
  vehicle_name?: string
  order_number?: string | null
  pickup_location?: string | null
  delivery_location?: string | null
  scheduled_at?: string | null
  order_status?: string | null
  invoice_number?: string | null
  invoice_status?: string | null
  created_at: string
  updated_at: string
}

export type MobileDocument = {
  id: string
  company_id: string
  branch_id?: string | null
  related_type?: string | null
  related_id?: string | null
  file_name: string
  file_path: string
  mime_type?: string | null
  uploaded_by?: string | null
  created_at: string
  access_url?: string | null
}

export type MobileCheckpoint = {
  id: string
  company_id: string
  trip_id: string
  branch_id?: string | null
  checkpoint_type: 'arrived_pickup' | 'departed_pickup' | 'arrived_delivery' | 'delivered'
  latitude: number
  longitude: number
  accuracy_meters?: number | string | null
  notes?: string | null
  captured_at: string
}

export type MobileTimeEntry = {
  id: string
  company_id: string
  employee_id: string
  branch_id?: string | null
  status: 'open' | 'submitted' | 'approved' | 'exported'
  work_date: string
  start_time: string
  end_time: string | null
  regular_minutes: number | string
  overtime_minutes: number | string
  break_minutes?: number | string
  notes?: string | null
}

export type MobileWorkforceEmployee = {
  id: string
  company_id: string
  branch_id?: string | null
  auth_user_id?: string | null
  full_name: string
  email?: string | null
  is_active: boolean
}

export type MobileTimeSummary = {
  employee: MobileWorkforceEmployee | null
  openEntry: MobileTimeEntry | null
  todaysMinutes: number
  submittedMinutes: number
  approvedWeekMinutes: number
  recentEntries: MobileTimeEntry[]
}

export type MobilePriorityItem = {
  id: string
  type: string
  title: string
  detail: string
  href?: string
  trip_id?: string
}

export type MobileTimelineItem = {
  id: string
  time: string
  title: string
  detail: string
  kind: 'shift' | 'trip'
  trip_id?: string
  status?: string
}

export type MobileMeResponse =
  | {
      ok: true
      membership: MobileMembership
      active_driver: MobileDriver
      matched_driver_id: string | null
      preview_driver_id: string | null
      is_preview_mode: boolean
      workforce_employee: MobileWorkforceEmployee | null
      available_preview_drivers: MobileDriver[]
    }
  | { error: string }

export type MobileHomeResponse =
  | {
      ok: true
      active_driver: MobileDriver
      preview_driver_id: string | null
      stats: {
        live_trips: number
        planned_trips: number
        document_count: number
        todays_minutes: number | string
        submitted_minutes: number | string
        approved_week_minutes: number | string
      }
      primary_trip: MobileTrip | null
      priority_items: MobilePriorityItem[]
      timeline_items: MobileTimelineItem[]
    }
  | { error: string }

export type MobileTripsResponse =
  | {
      ok: true
      active_driver: MobileDriver
      trips: MobileTrip[]
    }
  | { error: string }

export type MobileTripDetailResponse =
  | {
      ok: true
      trip: MobileTrip
      detail: {
        trip: MobileTrip
        order?: Record<string, unknown> | null
        customer?: Record<string, unknown> | null
        branch?: Record<string, unknown> | null
        vehicle?: Record<string, unknown> | null
        invoice?: Record<string, unknown> | null
      }
      documents: MobileDocument[]
      checkpoints: MobileCheckpoint[]
      time_summary: MobileTimeSummary | null
    }
  | { error: string }

export type MobileDocumentsResponse =
  | {
      ok: true
      documents: MobileDocument[]
    }
  | { error: string }

export type MobileTimeSummaryResponse =
  | {
      ok: true
      summary: MobileTimeSummary
    }
  | { error: string }

export type MobileTripMutationResponse =
  | {
      ok: true
      trip: MobileTrip
    }
  | { error: string }

export type MobileCheckpointMutationResponse =
  | {
      ok: true
      checkpoint: MobileCheckpoint
    }
  | { error: string }

export type MobileTimeEntryMutationResponse =
  | {
      ok: true
      entry: MobileTimeEntry
    }
  | { error: string }
