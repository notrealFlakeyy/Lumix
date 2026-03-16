import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)
const optionalUuid = z.string().uuid().optional().nullable().transform((value) => value ?? undefined)

export const payrollRunSchema = z
  .object({
    branch_id: optionalUuid,
    period_start: z.string().date(),
    period_end: z.string().date(),
    notes: optionalText,
  })
  .refine((value) => value.period_end >= value.period_start, {
    message: 'Period end must be on or after period start.',
    path: ['period_end'],
  })

export const payrollRunStatusSchema = z.enum(['draft', 'reviewed', 'exported', 'finalized'])

export type PayrollRunInput = z.infer<typeof payrollRunSchema>
