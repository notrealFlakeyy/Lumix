import { z } from 'zod'

export const companySetupSchema = z.object({
  name: z.string().min(2, 'Company name is required.'),
  business_id: z.string().optional(),
  vat_number: z.string().optional(),
  email: z.string().email('Enter a valid company email.').optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('FI'),
  timezone: z.string().default('Europe/Helsinki'),
})

export type CompanySetupInput = z.infer<typeof companySetupSchema>
