import { NextResponse } from 'next/server'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { createInvoiceSchema } from '@/modules/sales/schemas'
import { computeInvoiceTotals, normalizeCreateInvoice } from '@/modules/sales/service'

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'sales', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = createInvoiceSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: 'Invalid payload',
        issues: process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined,
      },
      { status: 400 },
    )
  }

  const normalized = normalizeCreateInvoice(parsed.data)
  const totals = computeInvoiceTotals(normalized.lines)

  const { data: invoice, error: invoiceError } = await auth.supabase
    .from('ar_invoices')
    .insert({
      org_id: auth.orgId,
      customer_id: normalized.customerId ?? null,
      invoice_number: normalized.invoiceNumber,
      reference_number: normalized.referenceNumber ?? null,
      due_date: normalized.dueDate ?? null,
      notes: normalized.notes ?? null,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      total: totals.total,
      status: 'draft',
    })
    .select('id')
    .single()

  if (invoiceError || !invoice) {
    console.error('Failed to create invoice', invoiceError)
    return NextResponse.json(
      {
        message: 'Failed to create invoice',
        code: invoiceError?.code ?? null,
        details: process.env.NODE_ENV === 'development' ? invoiceError : undefined,
      },
      { status: 500 },
    )
  }

  const { error: linesError } = await auth.supabase.from('ar_invoice_lines').insert(
    totals.computedLines.map((l) => ({
      org_id: auth.orgId,
      invoice_id: invoice.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      vat_rate: l.vatRate,
      line_subtotal: l.lineSubtotal,
      line_vat: l.lineVat,
      line_total: l.lineTotal,
    })),
  )

  if (linesError) {
    console.error('Failed to create invoice lines', linesError)
    return NextResponse.json(
      {
        message: 'Failed to create invoice lines',
        code: linesError.code ?? null,
        details: process.env.NODE_ENV === 'development' ? linesError : undefined,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ id: invoice.id })
}
