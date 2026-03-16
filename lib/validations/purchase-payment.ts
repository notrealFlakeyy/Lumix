import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)

export const purchasePaymentSchema = z.object({
  payment_date: z.string().date(),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  reference: optionalText,
  notes: optionalText,
})

export type PurchasePaymentInput = z.infer<typeof purchasePaymentSchema>
