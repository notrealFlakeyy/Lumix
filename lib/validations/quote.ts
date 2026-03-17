import { z } from 'zod'

import { quoteStatuses } from '@/types/app'
import { invoiceItemSchema } from '@/lib/validations/invoice'
import { optionalString, optionalUuid } from '@/lib/validations/shared'

export const quoteSchema = z.object({
  branch_id: optionalUuid,
  customer_id: z.string().uuid(),
  title: z.string().trim().min(1, 'Quote title is required'),
  pickup_location: z.string().trim().min(1, 'Pickup location is required'),
  delivery_location: z.string().trim().min(1, 'Delivery location is required'),
  cargo_description: optionalString,
  issue_date: z.string().min(1, 'Issue date is required'),
  valid_until: optionalString,
  status: z.enum(quoteStatuses),
  notes: optionalString,
  items: z.array(invoiceItemSchema).min(1, 'At least one quote line is required'),
})

export type QuoteInput = z.infer<typeof quoteSchema>
