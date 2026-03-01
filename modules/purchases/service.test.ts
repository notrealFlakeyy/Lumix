import { describe, expect, it } from 'vitest'

import { computeApInvoiceTotals } from './service'

describe('purchases.computeApInvoiceTotals', () => {
  it('computes totals across multiple lines', () => {
    const { subtotal, vatTotal, total } = computeApInvoiceTotals([
      { description: 'X', quantity: 1, unitPrice: 100, vatRate: 24, expenseAccountNo: '4000', vatAccountNo: '1570' },
      { description: 'Y', quantity: 2, unitPrice: 50, vatRate: 0, expenseAccountNo: '4000', vatAccountNo: '1570' },
    ])

    expect(subtotal).toBe(200)
    expect(vatTotal).toBe(24)
    expect(total).toBe(224)
  })
})

