import { z } from 'zod'

import { purchaseInvoiceStatuses } from '@/types/app'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)

export const purchaseInvoiceItemSchema = z.object({
  inventory_product_id: z.string().uuid().optional().nullable().transform((value) => value ?? undefined),
  description: z.string().trim().min(1, 'Line description is required.'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
  unit_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).default(25.5),
})

export const purchaseInvoiceSchema = z.object({
  branch_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  invoice_date: z.string().date(),
  due_date: z.string().date().optional().nullable().transform((value) => value ?? undefined),
  status: z.enum(purchaseInvoiceStatuses).default('draft'),
  reference_number: optionalText,
  notes: optionalText,
  items: z.array(purchaseInvoiceItemSchema).min(1, 'At least one line is required.'),
})

export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>
