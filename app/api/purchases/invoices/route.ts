import { NextResponse } from 'next/server'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { createApInvoiceSchema } from '@/modules/purchases/schemas'
import { computeApInvoiceTotals } from '@/modules/purchases/service'

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'purchaser', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = createApInvoiceSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
  }

  const totals = computeApInvoiceTotals(parsed.data.lines)

  const { data: invoice, error: invoiceError } = await auth.supabase
    .from('ap_invoices')
    .insert({
      org_id: auth.orgId,
      vendor_id: parsed.data.vendorId ?? null,
      vendor_invoice_number: parsed.data.vendorInvoiceNumber ?? null,
      due_date: parsed.data.dueDate ?? null,
      notes: parsed.data.notes ?? null,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      total: totals.total,
      status: 'draft',
    })
    .select('id')
    .single()

  if (invoiceError || !invoice) {
    return NextResponse.json({ message: 'Failed to create purchase invoice' }, { status: 500 })
  }

  const { error: linesError } = await auth.supabase.from('ap_invoice_lines').insert(
    totals.computedLines.map((l) => ({
      org_id: auth.orgId,
      invoice_id: invoice.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      vat_rate: l.vatRate,
      expense_account_no: l.expenseAccountNo,
      vat_account_no: l.vatAccountNo,
      line_subtotal: l.lineSubtotal,
      line_vat: l.lineVat,
      line_total: l.lineTotal,
    })),
  )

  if (linesError) {
    return NextResponse.json({ message: 'Failed to create purchase invoice lines' }, { status: 500 })
  }

  return NextResponse.json({ id: invoice.id })
}

