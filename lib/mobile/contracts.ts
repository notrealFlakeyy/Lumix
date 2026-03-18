import { z } from 'zod'

const isoDateTimeSchema = z.string().datetime({ offset: true })
const nullableStringSchema = z.string().nullable()
const numericLikeSchema = z.union([z.number(), z.string()])
const nullableNumberSchema = numericLikeSchema.nullable()

export const mobileErrorResponseSchema = z.object({
  error: z.string(),
})

export const mobileCompanySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    timezone: z.string(),
    country: z.string(),
  })
  .passthrough()

export const mobileMembershipSchema = z.object({
  company_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'dispatcher', 'accountant', 'driver', 'viewer']),
  enabled_modules: z.array(z.string()),
  branch_ids: z.array(z.string().uuid()),
  has_restricted_branch_access: z.boolean(),
  company: mobileCompanySchema,
})

export const mobileDriverSchema = z
  .object({
    id: z.string().uuid(),
    public_id: z.string().nullable().optional(),
    route_id: z.string().optional(),
    auth_user_id: z.string().uuid().nullable().optional(),
    full_name: z.string(),
    email: nullableStringSchema.optional(),
    phone: nullableStringSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .passthrough()

export const mobileTripSchema = z
  .object({
    id: z.string().uuid(),
    public_id: z.string(),
    route_id: z.string().optional(),
    company_id: z.string().uuid(),
    customer_id: z.string().uuid(),
    vehicle_id: z.string().uuid().nullable(),
    driver_id: z.string().uuid().nullable(),
    transport_order_id: z.string().uuid().nullable(),
    branch_id: z.string().uuid().nullable().optional(),
    status: z.enum(['planned', 'started', 'completed', 'invoiced']),
    start_time: nullableStringSchema,
    end_time: nullableStringSchema,
    start_km: nullableNumberSchema,
    end_km: nullableNumberSchema,
    distance_km: nullableNumberSchema,
    waiting_time_minutes: numericLikeSchema,
    delivery_confirmation: nullableStringSchema,
    delivery_recipient_name: nullableStringSchema.optional(),
    delivery_received_at: nullableStringSchema.optional(),
    customer_name: z.string().optional(),
    vehicle_name: z.string().optional(),
    order_number: nullableStringSchema.optional(),
    pickup_location: nullableStringSchema.optional(),
    delivery_location: nullableStringSchema.optional(),
    scheduled_at: nullableStringSchema.optional(),
    order_status: nullableStringSchema.optional(),
    invoice_number: nullableStringSchema.optional(),
    invoice_status: nullableStringSchema.optional(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .passthrough()

export const mobileDocumentSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    branch_id: z.string().uuid().nullable().optional(),
    related_type: nullableStringSchema.optional(),
    related_id: z.string().uuid().nullable().optional(),
    file_name: z.string(),
    file_path: z.string(),
    mime_type: nullableStringSchema.optional(),
    uploaded_by: z.string().uuid().nullable().optional(),
    created_at: isoDateTimeSchema,
    access_url: z.string().url().nullable().optional(),
  })
  .passthrough()

export const mobileCheckpointSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    trip_id: z.string().uuid(),
    branch_id: z.string().uuid().nullable().optional(),
    checkpoint_type: z.enum(['arrived_pickup', 'departed_pickup', 'arrived_delivery', 'delivered']),
    latitude: z.number(),
    longitude: z.number(),
    accuracy_meters: nullableNumberSchema.optional(),
    notes: nullableStringSchema.optional(),
    captured_at: isoDateTimeSchema,
  })
  .passthrough()

export const mobileTimeEntrySchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    branch_id: z.string().uuid().nullable().optional(),
    status: z.enum(['open', 'submitted', 'approved', 'exported']),
    work_date: z.string(),
    start_time: isoDateTimeSchema,
    end_time: nullableStringSchema,
    regular_minutes: numericLikeSchema,
    overtime_minutes: numericLikeSchema,
    break_minutes: numericLikeSchema.optional(),
    notes: nullableStringSchema.optional(),
  })
  .passthrough()

export const mobileWorkforceEmployeeSchema = z
  .object({
    id: z.string().uuid(),
    company_id: z.string().uuid(),
    branch_id: z.string().uuid().nullable().optional(),
    auth_user_id: z.string().uuid().nullable().optional(),
    full_name: z.string(),
    email: nullableStringSchema.optional(),
    is_active: z.boolean(),
  })
  .passthrough()

export const mobileTimeSummarySchema = z.object({
  employee: mobileWorkforceEmployeeSchema.nullable(),
  openEntry: mobileTimeEntrySchema.nullable(),
  todaysMinutes: z.number(),
  submittedMinutes: z.number(),
  approvedWeekMinutes: z.number(),
  recentEntries: z.array(mobileTimeEntrySchema),
})

export const mobileMeResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    membership: mobileMembershipSchema,
    active_driver: mobileDriverSchema,
    matched_driver_id: z.string().nullable(),
    preview_driver_id: z.string().nullable(),
    is_preview_mode: z.boolean(),
    workforce_employee: mobileWorkforceEmployeeSchema.nullable(),
    available_preview_drivers: z.array(mobileDriverSchema),
  }),
  mobileErrorResponseSchema,
])

export const mobileHomeResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    active_driver: mobileDriverSchema,
    preview_driver_id: z.string().nullable(),
    stats: z.object({
      live_trips: z.number(),
      planned_trips: z.number(),
      document_count: z.number(),
      todays_minutes: numericLikeSchema,
      submitted_minutes: numericLikeSchema,
      approved_week_minutes: numericLikeSchema,
    }),
    primary_trip: mobileTripSchema.nullable(),
    priority_items: z.array(
      z
        .object({
          id: z.string(),
          type: z.string(),
          title: z.string(),
          detail: z.string(),
          href: z.string().optional(),
          trip_id: z.string().optional(),
        })
        .passthrough(),
    ),
    timeline_items: z.array(
      z
        .object({
          id: z.string(),
          time: z.string(),
          title: z.string(),
          detail: z.string(),
          kind: z.enum(['shift', 'trip']),
          trip_id: z.string().optional(),
          status: z.string().optional(),
        })
        .passthrough(),
    ),
  }),
  mobileErrorResponseSchema,
])

export const mobileTripsResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    active_driver: mobileDriverSchema,
    trips: z.array(mobileTripSchema),
  }),
  mobileErrorResponseSchema,
])

export const mobileTripDetailResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    trip: mobileTripSchema,
    detail: z.object({
      trip: mobileTripSchema,
      order: z.object({ id: z.string().uuid().nullable().optional() }).passthrough().nullable().optional(),
      customer: z.object({ id: z.string().uuid() }).passthrough().nullable().optional(),
      branch: z.object({ id: z.string().uuid() }).passthrough().nullable().optional(),
      vehicle: z.object({ id: z.string().uuid() }).passthrough().nullable().optional(),
      invoice: z.object({ id: z.string().uuid() }).passthrough().nullable().optional(),
    }).passthrough(),
    documents: z.array(mobileDocumentSchema),
    checkpoints: z.array(mobileCheckpointSchema),
    time_summary: mobileTimeSummarySchema.nullable(),
  }),
  mobileErrorResponseSchema,
])

export const mobileDocumentsResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    documents: z.array(mobileDocumentSchema),
  }),
  mobileErrorResponseSchema,
])

export const mobileTimeSummaryResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    summary: mobileTimeSummarySchema,
  }),
  mobileErrorResponseSchema,
])

export const mobileTripStartRequestSchema = z.object({
  start_km: numericLikeSchema.nullable().optional(),
  notes: nullableStringSchema.optional(),
})

export const mobileTripCompleteRequestSchema = z.object({
  end_km: numericLikeSchema.nullable().optional(),
  waiting_time_minutes: z.number().int().min(0).optional(),
  delivery_confirmation: nullableStringSchema.optional(),
  notes: nullableStringSchema.optional(),
})

export const mobileTripCheckpointRequestSchema = z.object({
  checkpoint_type: z.enum(['arrived_pickup', 'departed_pickup', 'arrived_delivery', 'delivered']),
  latitude: z.number(),
  longitude: z.number(),
  accuracy_meters: numericLikeSchema.nullable().optional(),
  notes: nullableStringSchema.optional(),
})

export const mobileDeliveryProofRequestSchema = z.object({
  delivery_recipient_name: z.string().min(1),
  delivery_confirmation: z.string().min(1),
  signature_data_url: z
    .string()
    .regex(/^data:image\/(png|jpeg|jpg);base64,/, 'Proof image must be a PNG or JPEG data URL.'),
})

export const mobileShiftClockOutRequestSchema = z.object({
  break_minutes: z.number().int().min(0).optional(),
  notes: nullableStringSchema.optional(),
})

export const mobileTripMutationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    trip: mobileTripSchema,
  }),
  mobileErrorResponseSchema,
])

export const mobileCheckpointMutationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    checkpoint: mobileCheckpointSchema,
  }),
  mobileErrorResponseSchema,
])

export const mobileTimeEntryMutationResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    entry: mobileTimeEntrySchema,
  }),
  mobileErrorResponseSchema,
])

export type MobileMeResponse = z.infer<typeof mobileMeResponseSchema>
export type MobileHomeResponse = z.infer<typeof mobileHomeResponseSchema>
export type MobileTripsResponse = z.infer<typeof mobileTripsResponseSchema>
export type MobileTripDetailResponse = z.infer<typeof mobileTripDetailResponseSchema>
