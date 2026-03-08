import { z } from 'zod'

import { optionalString } from '@/lib/validations/shared'

const optionalInteger = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : value
}, z.number().int().positive().optional())

const optionalNonNegativeNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().nonnegative().optional())

const optionalHexColor = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}, z.string().regex(/^#(?:[0-9a-fA-F]{6})$/, 'Enter a valid hex color.').optional())

export const companyAppSettingsSchema = z.object({
  order_prefix: z.string().trim().min(2).max(10).default('ORD'),
  order_next_number: optionalInteger.default(1),
  invoice_prefix: z.string().trim().min(2).max(10).default('INV'),
  invoice_next_number: optionalInteger.default(1),
  default_payment_terms_days: optionalInteger.default(14),
  default_vat_rate: optionalNonNegativeNumber.default(25.5),
  fuel_cost_per_km: optionalNonNegativeNumber.default(0.42),
  maintenance_cost_per_km: optionalNonNegativeNumber.default(0.18),
  driver_cost_per_hour: optionalNonNegativeNumber.default(32),
  waiting_cost_per_hour: optionalNonNegativeNumber.default(24),
  default_currency: z.string().trim().min(3).max(3).default('EUR'),
  invoice_footer: optionalString,
  brand_accent: optionalHexColor.default('#0f172a'),
})

export type CompanyAppSettingsInput = z.infer<typeof companyAppSettingsSchema>
