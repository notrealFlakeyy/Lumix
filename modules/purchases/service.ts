import type { z } from 'zod'

import { createApInvoiceSchema } from './schemas'

export type CreateApInvoiceInput = z.infer<typeof createApInvoiceSchema>

export function computeApInvoiceTotals(lines: CreateApInvoiceInput['lines']) {
  const computedLines = lines.map((line) => {
    const lineSubtotal = line.quantity * line.unitPrice
    const lineVat = lineSubtotal * (line.vatRate / 100)
    const lineTotal = lineSubtotal + lineVat
    return {
      ...line,
      lineSubtotal: round2(lineSubtotal),
      lineVat: round2(lineVat),
      lineTotal: round2(lineTotal),
    }
  })

  const subtotal = round2(computedLines.reduce((sum, l) => sum + l.lineSubtotal, 0))
  const vatTotal = round2(computedLines.reduce((sum, l) => sum + l.lineVat, 0))
  const total = round2(subtotal + vatTotal)

  return { computedLines, subtotal, vatTotal, total }
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

