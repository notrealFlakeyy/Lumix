import { z } from 'zod'

import { orderStatuses } from '@/types/app'
import { optionalString, optionalUuid } from '@/lib/validations/shared'

export const orderSchema = z.object({
  customer_id: z.string().uuid(),
  assigned_vehicle_id: optionalUuid,
  assigned_driver_id: optionalUuid,
  pickup_location: z.string().trim().min(1, 'Pickup location is required'),
  delivery_location: z.string().trim().min(1, 'Delivery location is required'),
  cargo_description: optionalString,
  scheduled_at: z.union([z.literal(''), z.string().datetime({ offset: true })]).optional().transform((value) => value || undefined),
  status: z.enum(orderStatuses),
  notes: optionalString,
})

export type OrderInput = z.infer<typeof orderSchema>
