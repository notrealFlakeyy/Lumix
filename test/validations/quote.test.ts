import { describe, expect, it } from 'vitest'

import { quoteSchema } from '@/lib/validations/quote'

const baseInput = {
  branch_id: undefined,
  customer_id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Daily shuttle work',
  pickup_location: 'Helsinki terminal',
  delivery_location: 'Turku warehouse',
  cargo_description: undefined,
  issue_date: '2026-03-17',
  valid_until: '2026-03-31',
  status: 'draft',
  notes: undefined,
  items: [
    {
      description: 'Transport service',
      quantity: 1,
      unit_price: 420,
      vat_rate: 25.5,
      line_total: 420,
    },
  ],
}

describe('quoteSchema', () => {
  it('requires a title', () => {
    const result = quoteSchema.safeParse({
      ...baseInput,
      title: '',
    })

    expect(result.success).toBe(false)
  })

  it('requires at least one quote line', () => {
    const result = quoteSchema.safeParse({
      ...baseInput,
      items: [],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a valid quote payload', () => {
    const result = quoteSchema.safeParse(baseInput)

    expect(result.success).toBe(true)
  })
})
