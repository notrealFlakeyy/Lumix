import { describe, expect, it } from 'vitest'

import { computeInvoiceTotals } from './service'

describe('sales.computeInvoiceTotals', () => {
  it('computes subtotal, VAT and total', () => {
    const { subtotal, vatTotal, total, computedLines } = computeInvoiceTotals([
      { description: 'A', quantity: 2, unitPrice: 10, vatRate: 24 },
    ])

    expect(computedLines[0].lineSubtotal).toBe(20)
    expect(computedLines[0].lineVat).toBe(4.8)
    expect(subtotal).toBe(20)
    expect(vatTotal).toBe(4.8)
    expect(total).toBe(24.8)
  })
})

