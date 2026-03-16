import { z } from 'zod'

import { inventoryMovementTypes } from '@/types/app'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)

export const inventoryMovementSchema = z.object({
  product_id: z.string().uuid(),
  movement_type: z.enum(inventoryMovementTypes),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.'),
  unit_cost: z.coerce.number().min(0).optional().nullable().transform((value) => value ?? undefined),
  reference: optionalText,
  notes: optionalText,
  occurred_at: z.string().datetime().optional(),
})

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>
