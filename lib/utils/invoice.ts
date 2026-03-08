import type { InvoiceStatus } from '@/types/app'

import { toNumber } from '@/lib/utils/numbers'

export type InvoiceLineInput = {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export function computeInvoiceLineTotal(line: InvoiceLineInput) {
  return Number((line.quantity * line.unitPrice).toFixed(2))
}

export function computeInvoiceTotals(lines: InvoiceLineInput[]) {
  const subtotal = Number(lines.reduce((sum, line) => sum + computeInvoiceLineTotal(line), 0).toFixed(2))
  const vatTotal = Number(
    lines.reduce((sum, line) => sum + computeInvoiceLineTotal(line) * (line.vatRate / 100), 0).toFixed(2),
  )
  return {
    subtotal,
    vatTotal,
    total: Number((subtotal + vatTotal).toFixed(2)),
  }
}

export function deriveInvoiceStatus(currentStatus: InvoiceStatus, total: number, paidAmount: number, dueDate: string): InvoiceStatus {
  if (currentStatus === 'cancelled') return 'cancelled'

  const duePassed = dueDate < new Date().toISOString().slice(0, 10)
  const safeTotal = toNumber(total)
  const safePaid = toNumber(paidAmount)

  if (safePaid >= safeTotal && safeTotal > 0) return 'paid'
  if (safePaid > 0 && safePaid < safeTotal) return 'partially_paid'
  if (safePaid === 0 && duePassed) return 'overdue'
  if (currentStatus === 'draft') return 'draft'
  return 'sent'
}

export function createTripInvoiceItems(distanceKm: number, waitingTimeMinutes: number, vatRate = 25.5) {
  const baseRate = distanceKm > 0 ? Number((distanceKm * 1.85).toFixed(2)) : 420
  const items: InvoiceLineInput[] = [
    {
      description: 'Transport service',
      quantity: 1,
      unitPrice: baseRate,
      vatRate,
    },
  ]

  if (waitingTimeMinutes > 0) {
    items.push({
      description: 'Waiting time',
      quantity: Number((waitingTimeMinutes / 60).toFixed(2)),
      unitPrice: 68,
      vatRate,
    })
  }

  return items
}

export function buildInvoicePdfPath(locale: string, invoiceId: string) {
  return `/${locale}/invoices/${invoiceId}/pdf`
}

export function buildInvoicePdfFileName(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`
}
