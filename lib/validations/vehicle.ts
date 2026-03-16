import { z } from 'zod'

import { optionalNumber, optionalString, optionalUuid } from '@/lib/validations/shared'

export const vehicleSchema = z.object({
  branch_id: optionalUuid,
  registration_number: z.string().trim().min(1, 'Registration number is required'),
  make: optionalString,
  model: optionalString,
  year: optionalNumber.refine((value) => value === undefined || Number.isInteger(value), 'Year must be an integer'),
  fuel_type: optionalString,
  current_km: optionalNumber,
  next_service_km: optionalNumber,
  is_active: z.boolean().default(true),
})

export type VehicleInput = z.infer<typeof vehicleSchema>
