import { describe, expect, it } from 'vitest'

import { recurringOrderSchema } from '@/lib/validations/recurring-order'

const baseInput = {
  branch_id: undefined,
  customer_id: '550e8400-e29b-41d4-a716-446655440000',
  vehicle_id: undefined,
  driver_id: undefined,
  pickup_location: 'Helsinki',
  delivery_location: 'Turku',
  cargo_description: undefined,
  notes: undefined,
  recurrence_rule: 'weekly',
  next_occurrence_date: '2026-03-20',
  is_active: true,
}

describe('recurringOrderSchema', () => {
  it('requires a customer', () => {
    const result = recurringOrderSchema.safeParse({
      ...baseInput,
      customer_id: '',
      recurrence_day_of_week: 5,
    })

    expect(result.success).toBe(false)
  })

  it('requires a weekday for weekly recurrences', () => {
    const result = recurringOrderSchema.safeParse(baseInput)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'recurrence_day_of_week')).toBe(true)
    }
  })

  it('requires a day of month for monthly recurrences', () => {
    const result = recurringOrderSchema.safeParse({
      ...baseInput,
      recurrence_rule: 'monthly',
      recurrence_day_of_week: undefined,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join('.') === 'recurrence_day_of_month')).toBe(true)
    }
  })

  it('accepts a complete recurring template', () => {
    const result = recurringOrderSchema.safeParse({
      ...baseInput,
      recurrence_day_of_week: 5,
    })

    expect(result.success).toBe(true)
  })
})
