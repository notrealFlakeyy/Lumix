import { z } from 'zod'
import { platformModuleKeys } from '@/types/app'

export const companySetupSchema = z.object({
  name: z.string().min(2, 'Company name is required.'),
  business_id: z.string().optional(),
  vat_number: z.string().optional(),
  email: z.string().email('Enter a valid company email.').optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('FI'),
  timezone: z.string().default('Europe/Helsinki'),
  business_type: z.enum(['transport', 'warehouse', 'hybrid', 'operations']).default('transport'),
  enabled_modules: z.array(z.enum(platformModuleKeys)).optional(),
  initial_branch_name: z.string().optional(),
  initial_branch_code: z.string().optional(),
})

export type CompanySetupInput = z.infer<typeof companySetupSchema>
