import { z } from 'zod'

const optionalUuid = z.string().uuid().optional().nullable().transform((value) => value ?? undefined)
const optionalText = z.string().trim().optional().transform((value) => value || undefined)

export const inventoryProductSchema = z.object({
  branch_id: z.string().uuid(),
  sku: z.string().trim().min(1, 'SKU is required.'),
  name: z.string().trim().min(1, 'Product name is required.'),
  category: optionalText,
  unit: z.string().trim().min(1).default('pcs'),
  reorder_level: z.coerce.number().min(0).default(0),
  cost_price: z.coerce.number().min(0).default(0),
  sale_price: z.coerce.number().min(0).optional().nullable().transform((value) => value ?? undefined),
  notes: optionalText,
  is_active: z.coerce.boolean().default(true),
})

export type InventoryProductInput = z.infer<typeof inventoryProductSchema>

export const inventoryProductFiltersSchema = z.object({
  branch_id: optionalUuid,
})
