import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)
const optionalUuid = z.string().uuid().optional().nullable().transform((value) => value ?? undefined)

export const workforceEmployeeSchema = z.object({
  branch_id: z.string().uuid(),
  auth_user_id: optionalUuid,
  full_name: z.string().trim().min(1, 'Employee name is required.'),
  email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')).transform((value) => value || undefined),
  phone: optionalText,
  job_title: optionalText,
  employment_type: optionalText,
  pay_type: z.enum(['hourly', 'salary']).default('hourly'),
  hourly_rate: z.coerce.number().min(0).default(0),
  overtime_rate: z.coerce.number().min(0).optional().nullable().transform((value) => value ?? undefined),
  notes: optionalText,
  is_active: z.coerce.boolean().default(true),
})

export type WorkforceEmployeeInput = z.infer<typeof workforceEmployeeSchema>
