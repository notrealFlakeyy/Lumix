import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)
const optionalDateTime = z.string().datetime({ offset: true }).optional().nullable().transform((value) => value ?? undefined)

export const manualTimeEntrySchema = z
  .object({
    employee_id: z.string().uuid(),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    break_minutes: z.coerce.number().int().min(0).default(0),
    notes: optionalText,
  })
  .refine((value) => new Date(value.end_time).getTime() > new Date(value.start_time).getTime(), {
    message: 'End time must be after start time.',
    path: ['end_time'],
  })

export const finishTimeEntrySchema = z.object({
  break_minutes: z.coerce.number().int().min(0).default(0),
  notes: optionalText,
  end_time: optionalDateTime,
})

export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>
export type FinishTimeEntryInput = z.infer<typeof finishTimeEntrySchema>
