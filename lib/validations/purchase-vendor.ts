import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)

export const purchaseVendorSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Vendor name is required.'),
  business_id: optionalText,
  email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')).transform((value) => value || undefined),
  phone: optionalText,
  address_line1: optionalText,
  address_line2: optionalText,
  postal_code: optionalText,
  city: optionalText,
  country: z.string().trim().min(2).default('FI'),
  notes: optionalText,
  is_active: z.coerce.boolean().default(true),
})

export type PurchaseVendorInput = z.infer<typeof purchaseVendorSchema>
