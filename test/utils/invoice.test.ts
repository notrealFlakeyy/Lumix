import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  computeInvoiceTotals,
  deriveInvoiceStatus,
  createTripInvoiceItems,
  type InvoiceLineInput,
} from '@/lib/utils/invoice'

// ---------------------------------------------------------------------------
// computeInvoiceTotals
// ---------------------------------------------------------------------------
describe('computeInvoiceTotals', () => {
  it('returns zero totals for an empty items array', () => {
    const result = computeInvoiceTotals([])
    expect(result).toEqual({ subtotal: 0, vatTotal: 0, total: 0 })
  })

  it('calculates a single item with 0% VAT', () => {
    const items: InvoiceLineInput[] = [
      { description: 'Transport', quantity: 2, unitPrice: 100, vatRate: 0 },
    ]
    const result = computeInvoiceTotals(items)
    expect(result.subtotal).toBe(200)
    expect(result.vatTotal).toBe(0)
    expect(result.total).toBe(200)
  })

  it('calculates a single item with 24% VAT', () => {
    const items: InvoiceLineInput[] = [
      { description: 'Transport', quantity: 1, unitPrice: 100, vatRate: 24 },
    ]
    const result = computeInvoiceTotals(items)
    expect(result.subtotal).toBe(100)
    expect(result.vatTotal).toBe(24)
    expect(result.total).toBe(124)
  })

  it('calculates multiple items with different VAT rates', () => {
    const items: InvoiceLineInput[] = [
      { description: 'Transport', quantity: 1, unitPrice: 200, vatRate: 25.5 },
      { description: 'Waiting', quantity: 2, unitPrice: 50, vatRate: 0 },
    ]
    const result = computeInvoiceTotals(items)
    expect(result.subtotal).toBe(300)
    expect(result.vatTotal).toBe(51)
    expect(result.total).toBe(351)
  })

  it('avoids floating point errors on tricky decimals', () => {
    const items: InvoiceLineInput[] = [
      { description: 'Fuel surcharge', quantity: 3, unitPrice: 0.1, vatRate: 24 },
    ]
    const result = computeInvoiceTotals(items)
    expect(result.subtotal).toBe(0.3)
    expect(result.vatTotal).toBe(0.07)
    expect(result.total).toBe(0.37)
  })

  it('handles negative quantities', () => {
    const items: InvoiceLineInput[] = [
      { description: 'Credit', quantity: -1, unitPrice: 100, vatRate: 24 },
    ]
    const result = computeInvoiceTotals(items)
    expect(result.subtotal).toBe(-100)
    expect(result.vatTotal).toBe(-24)
    expect(result.total).toBe(-124)
  })
})

// ---------------------------------------------------------------------------
// deriveInvoiceStatus
// ---------------------------------------------------------------------------
describe('deriveInvoiceStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps draft when no payments and due date is in the future', () => {
    const status = deriveInvoiceStatus('draft', 500, 0, '2099-12-31')
    expect(status).toBe('draft')
  })

  it('returns overdue when unpaid and due date is past', () => {
    const status = deriveInvoiceStatus('sent', 500, 0, '2020-01-01')
    expect(status).toBe('overdue')
  })

  it('returns paid when paidAmount >= total', () => {
    const status = deriveInvoiceStatus('sent', 500, 500, '2099-12-31')
    expect(status).toBe('paid')
  })

  it('returns paid when paidAmount exceeds total (overpaid)', () => {
    const status = deriveInvoiceStatus('sent', 500, 600, '2099-12-31')
    expect(status).toBe('paid')
  })

  it('returns partially_paid when some amount is paid', () => {
    const status = deriveInvoiceStatus('sent', 500, 100, '2099-12-31')
    expect(status).toBe('partially_paid')
  })

  it('keeps cancelled regardless of other conditions', () => {
    const status = deriveInvoiceStatus('cancelled', 500, 500, '2020-01-01')
    expect(status).toBe('cancelled')
  })

  it('returns sent when not draft, not overdue, not paid', () => {
    const status = deriveInvoiceStatus('sent', 500, 0, '2099-12-31')
    expect(status).toBe('sent')
  })
})

// ---------------------------------------------------------------------------
// createTripInvoiceItems
// ---------------------------------------------------------------------------
describe('createTripInvoiceItems', () => {
  it('creates a single transport item for km with no waiting time', () => {
    const items = createTripInvoiceItems(100, 0)
    expect(items).toHaveLength(1)
    expect(items[0].description).toBe('Transport service')
    expect(items[0].unitPrice).toBe(185) // 100 * 1.85
    expect(items[0].quantity).toBe(1)
    expect(items[0].vatRate).toBe(25.5)
  })

  it('uses minimum price (420) when distance is 0', () => {
    const items = createTripInvoiceItems(0, 0)
    expect(items).toHaveLength(1)
    expect(items[0].unitPrice).toBe(420)
  })

  it('uses minimum price (420) when distance is negative', () => {
    const items = createTripInvoiceItems(-10, 0)
    expect(items).toHaveLength(1)
    expect(items[0].unitPrice).toBe(420)
  })

  it('adds a waiting time item when waiting minutes > 0', () => {
    const items = createTripInvoiceItems(50, 90)
    expect(items).toHaveLength(2)

    const waitingItem = items[1]
    expect(waitingItem.description).toBe('Waiting time')
    expect(waitingItem.quantity).toBe(1.5) // 90 / 60
    expect(waitingItem.unitPrice).toBe(68)
  })

  it('creates both km and waiting items together', () => {
    const items = createTripInvoiceItems(200, 30)
    expect(items).toHaveLength(2)
    expect(items[0].unitPrice).toBe(370) // 200 * 1.85
    expect(items[1].quantity).toBe(0.5) // 30 / 60
  })
})
