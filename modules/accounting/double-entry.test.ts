import { describe, expect, it } from 'vitest'

import { isBalanced } from './double-entry'

describe('accounting.isBalanced', () => {
  it('returns true for balanced lines', () => {
    expect(isBalanced([{ debit: 100, credit: 0 }, { debit: 0, credit: 100 }])).toBe(true)
  })

  it('returns false for unbalanced lines', () => {
    expect(isBalanced([{ debit: 100, credit: 0 }, { debit: 0, credit: 99.99 }])).toBe(false)
  })
})

