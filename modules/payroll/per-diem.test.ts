import { describe, expect, it } from 'vitest'

import { calculatePerDiem } from './per-diem'

describe('payroll.calculatePerDiem', () => {
  it('returns full day per diem', () => {
    expect(calculatePerDiem({ fullDayEur: 50, partialDayEur: 20 }, 10)).toBe(50)
  })

  it('returns partial per diem', () => {
    expect(calculatePerDiem({ fullDayEur: 50, partialDayEur: 20 }, 6)).toBe(20)
  })
})

