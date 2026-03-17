import { z } from 'zod'

import { optionalString, optionalUuid } from '@/lib/validations/shared'

export const recurrenceRules = ['daily', 'weekly', 'biweekly', 'monthly'] as const
export type RecurrenceRule = (typeof recurrenceRules)[number]

export const recurringOrderSchema = z.object({
  branch_id: optionalUuid,
  customer_id: z.string().uuid('Customer is required'),
  vehicle_id: optionalUuid,
  driver_id: optionalUuid,
  pickup_location: z.string().trim().min(1, 'Pickup location is required'),
  delivery_location: z.string().trim().min(1, 'Delivery location is required'),
  cargo_description: optionalString,
  notes: optionalString,
  recurrence_rule: z.enum(recurrenceRules),
  recurrence_day_of_week: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : value
    },
    z.number().min(0).max(6).optional(),
  ),
  recurrence_day_of_month: z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : value
    },
    z.number().min(1).max(31).optional(),
  ),
  next_occurrence_date: z.string().trim().min(1, 'Next occurrence date is required'),
  is_active: z.boolean().default(true),
}).superRefine((input, ctx) => {
  if ((input.recurrence_rule === 'weekly' || input.recurrence_rule === 'biweekly') && input.recurrence_day_of_week === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrence_day_of_week'],
      message: 'Choose a day of week for weekly recurrences.',
    })
  }

  if (input.recurrence_rule === 'monthly' && input.recurrence_day_of_month === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recurrence_day_of_month'],
      message: 'Choose a day of month for monthly recurrences.',
    })
  }
})

export type RecurringOrderInput = z.infer<typeof recurringOrderSchema>
