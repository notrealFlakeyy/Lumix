import { describe, expect, it } from 'vitest'

import { weightedAverageUnitCost } from './weighted-average'

describe('inventory.weightedAverageUnitCost', () => {
  it('computes weighted average for receipts and issues', () => {
    const avg = weightedAverageUnitCost([
      { qty: 10, unitCost: 5 },
      { qty: 10, unitCost: 7 },
      { qty: -5 },
    ])

    expect(avg).toBeCloseTo(6, 5)
  })
})

