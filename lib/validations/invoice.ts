import { z } from 'zod'

import { invoiceStatuses } from '@/types/app'
import { optionalNumber, optionalString, optionalUuid } from '@/lib/validations/shared'

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  quantity: z.preprocess((value) => Number(value), z.number().positive()),
  unit_price: z.preprocess((value) => Number(value), z.number().nonnegative()),
  vat_rate: z.preprocess((value) => Number(value), z.number().nonnegative()),
  line_total: optionalNumber,
})

export const invoiceSchema = z.object({
  customer_id: z.string().uuid(),
  trip_id: optionalUuid,
  issue_date: z.string().min(1),
  due_date: z.string().min(1),
  reference_number: optionalString,
  status: z.enum(invoiceStatuses),
  notes: optionalString,
  items: z.array(invoiceItemSchema).min(1, 'At least one invoice item is required'),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
