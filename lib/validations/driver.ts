import { z } from 'zod'

import { optionalString, optionalUuid } from '@/lib/validations/shared'

export const driverSchema = z.object({
  branch_id: optionalUuid,
  full_name: z.string().trim().min(1, 'Driver name is required'),
  phone: optionalString,
  email: z.union([z.literal(''), z.string().email()]).optional().transform((value) => value || undefined),
  license_type: optionalString,
  employment_type: optionalString,
  is_active: z.boolean().default(true),
})

export type DriverInput = z.infer<typeof driverSchema>
