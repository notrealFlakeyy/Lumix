import { z } from 'zod'

import { optionalString } from '@/lib/validations/shared'

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.union([z.literal(''), z.string().email()]).optional().transform((value) => value || undefined),
  business_id: optionalString,
  vat_number: optionalString,
  phone: optionalString,
  billing_address_line1: optionalString,
  billing_address_line2: optionalString,
  billing_postal_code: optionalString,
  billing_city: optionalString,
  billing_country: optionalString,
  notes: optionalString,
})

export type CustomerInput = z.infer<typeof customerSchema>
