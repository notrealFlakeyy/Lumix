import { describe, expect, it } from 'vitest'

import { computePnL } from './pnl'

describe('reporting.computePnL', () => {
  it('computes net profit', () => {
    const { income, expense, net } = computePnL([
      { type: 'income', debit: 0, credit: 1000 },
      { type: 'expense', debit: 400, credit: 0 },
    ])

    expect(income).toBe(1000)
    expect(expense).toBe(400)
    expect(net).toBe(600)
  })
})

