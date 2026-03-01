import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { parseBankCsv } from '@/modules/banking/csv'

const schema = z.object({
  filename: z.string().trim().optional().nullable(),
  csvText: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin', 'accountant'].includes(auth.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = schema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })

  const rows = parseBankCsv(parsed.data.csvText)

  const { data: importRow, error: importError } = await auth.supabase
    .from('bank_imports')
    .insert({
      org_id: auth.orgId,
      source: 'csv',
      original_filename: parsed.data.filename ?? null,
      imported_by: auth.user.id,
      stats: { parsed: rows.length },
    })
    .select('id')
    .single()

  if (importError || !importRow) return NextResponse.json({ message: 'Failed to create import' }, { status: 500 })

  let matched = 0
  let createdPayments = 0

  for (const r of rows) {
    if (r.amount <= 0) {
      await auth.supabase.from('bank_transactions').insert({
        org_id: auth.orgId,
        import_id: importRow.id,
        booking_date: r.bookingDate,
        amount: r.amount,
        currency: 'EUR',
        counterparty_name: r.counterpartyName ?? null,
        reference_number: r.referenceNumber ?? null,
        message: r.message ?? null,
        raw: r.raw,
      })
      continue
    }

    const { data: invoice } = await auth.supabase
      .from('ar_invoices')
      .select('id, total, status, reference_number')
      .eq('org_id', auth.orgId)
      .in('status', ['sent', 'overdue'])
      .eq('reference_number', r.referenceNumber ?? '')
      .eq('total', String(r.amount))
      .limit(1)
      .maybeSingle()

    if (invoice?.id) {
      const { error: payError } = await auth.supabase.rpc('record_ar_payment', {
        p_invoice_id: invoice.id,
        p_payment_date: r.bookingDate,
        p_amount: r.amount,
        p_reference_number: r.referenceNumber ?? null,
      })
      if (!payError) {
        matched += 1
        createdPayments += 1
        await auth.supabase.from('bank_transactions').insert({
          org_id: auth.orgId,
          import_id: importRow.id,
          booking_date: r.bookingDate,
          amount: r.amount,
          currency: 'EUR',
          counterparty_name: r.counterpartyName ?? null,
          reference_number: r.referenceNumber ?? null,
          message: r.message ?? null,
          raw: r.raw,
          matched_invoice_id: invoice.id,
        })
        continue
      }
    }

    await auth.supabase.from('bank_transactions').insert({
      org_id: auth.orgId,
      import_id: importRow.id,
      booking_date: r.bookingDate,
      amount: r.amount,
      currency: 'EUR',
      counterparty_name: r.counterpartyName ?? null,
      reference_number: r.referenceNumber ?? null,
      message: r.message ?? null,
      raw: r.raw,
    })
  }

  await auth.supabase
    .from('bank_imports')
    .update({ stats: { parsed: rows.length, matched, createdPayments } })
    .eq('id', importRow.id)

  return NextResponse.json({ importId: importRow.id, parsed: rows.length, matched, createdPayments })
}
