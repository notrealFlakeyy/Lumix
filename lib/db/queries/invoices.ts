import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { toNumber } from '@/lib/utils/numbers'

export async function listInvoices(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: invoices }, { data: customers }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('payments').select('invoice_id, amount').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const paidTotals = new Map<string, number>()
  for (const payment of payments ?? []) {
    paidTotals.set(payment.invoice_id, (paidTotals.get(payment.invoice_id) ?? 0) + toNumber(payment.amount))
  }

  return ((invoices ?? []) as TableRow<'invoices'>[]).map((invoice) => {
    const paidAmount = paidTotals.get(invoice.id) ?? 0
    const total = toNumber(invoice.total)
    return {
      ...invoice,
      customer_name: customerMap.get(invoice.customer_id)?.name ?? 'Unknown customer',
      paid_amount: paidAmount,
      balance_due: Number((total - paidAmount).toFixed(2)),
    }
  })
}

export async function getInvoiceById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: invoice }, { data: customers }, { data: items }, { data: payments }, { data: trips }] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase.from('customers').select('*').eq('company_id', companyId),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('description'),
    supabase.from('payments').select('*').eq('company_id', companyId).eq('invoice_id', id).order('payment_date', { ascending: false }),
    supabase.from('trips').select('id, status, start_time, end_time, distance_km').eq('company_id', companyId),
  ])

  const typedInvoice = invoice as TableRow<'invoices'> | null
  if (!typedInvoice) return null

  const customerMap = byId((customers ?? []) as TableRow<'customers'>[])
  const tripMap = byId((trips ?? []) as Array<TableRow<'trips'> & { id: string }>)

  return {
    invoice: typedInvoice,
    customer: customerMap.get(typedInvoice.customer_id) ?? null,
    items: (items ?? []) as TableRow<'invoice_items'>[],
    payments: (payments ?? []) as TableRow<'payments'>[],
    trip: typedInvoice.trip_id ? tripMap.get(typedInvoice.trip_id) ?? null : null,
  }
}

export async function getInvoicePayments(invoiceId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false })
  return data ?? []
}
