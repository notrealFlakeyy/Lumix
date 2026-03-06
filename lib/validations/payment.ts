import { z } from 'zod'

import { optionalString } from '@/lib/validations/shared'

export const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  payment_date: z.string().min(1),
  amount: z.preprocess((value) => Number(value), z.number().positive()),
  payment_method: optionalString,
  reference: optionalString,
})

export type PaymentInput = z.infer<typeof paymentSchema>
