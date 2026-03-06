import { z } from 'zod'

import { tripStatuses } from '@/types/app'
import { optionalNumber, optionalString, optionalUuid } from '@/lib/validations/shared'

export const tripSchema = z.object({
  transport_order_id: optionalUuid,
  customer_id: z.string().uuid(),
  vehicle_id: optionalUuid,
  driver_id: optionalUuid,
  start_time: z.union([z.literal(''), z.string().datetime({ offset: true })]).optional().transform((value) => value || undefined),
  end_time: z.union([z.literal(''), z.string().datetime({ offset: true })]).optional().transform((value) => value || undefined),
  start_km: optionalNumber,
  end_km: optionalNumber,
  distance_km: optionalNumber,
  waiting_time_minutes: z.preprocess((value) => Number(value ?? 0), z.number().int().nonnegative()),
  notes: optionalString,
  delivery_confirmation: optionalString,
  status: z.enum(tripStatuses),
})

export type TripInput = z.infer<typeof tripSchema>
