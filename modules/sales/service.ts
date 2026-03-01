import { createInvoiceSchema } from './schemas'

export type CreateInvoiceInput = ReturnType<typeof createInvoiceSchema.parse>

const buildInvoiceNumber = () => {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `INV-${stamp}-${rand}`
}

export function computeInvoiceTotals(lines: CreateInvoiceInput['lines']) {
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

export function normalizeCreateInvoice(input: CreateInvoiceInput) {
  return {
    ...input,
    invoiceNumber: input.invoiceNumber?.trim() || buildInvoiceNumber(),
  }
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

