import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { defaultCompanyAppSettings } from '@/lib/db/queries/company-settings'
import { toNumber } from '@/lib/utils/numbers'

export type InvoiceTemplateSettings = Pick<
  TableRow<'company_app_settings'>,
  'default_currency' | 'invoice_footer' | 'brand_accent' | 'invoice_payment_instructions' | 'invoice_logo_url'
>

export type InvoiceDetailBundle = {
  company: TableRow<'companies'>
  invoice: TableRow<'invoices'>
  branch: Pick<TableRow<'branches'>, 'id' | 'name'> | null
  settings: InvoiceTemplateSettings
  customer: TableRow<'customers'> | null
  items: TableRow<'invoice_items'>[]
  payments: TableRow<'payments'>[]
  trip: Pick<TableRow<'trips'>, 'id' | 'public_id' | 'status' | 'start_time' | 'end_time' | 'distance_km'> | null
}

export async function listInvoices(
  companyId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
  page = 1,
  pageSize = 50,
  search?: string,
  status?: string,
) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  const offset = (page - 1) * pageSize
  let invoicesQuery = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (branchScope) {
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }
  if (search) {
    invoicesQuery = invoicesQuery.ilike('invoice_number', `%${search}%`)
  }
  if (status) {
    invoicesQuery = invoicesQuery.eq('status', status)
  }

  const { data: invoices, count } = await invoicesQuery

  const rawInvoices = (invoices ?? []) as TableRow<'invoices'>[]
  if (rawInvoices.length === 0) return { data: [], total: count ?? 0 }

  const invoiceIds = rawInvoices.map((i) => i.id)
  const customerIds = [...new Set(rawInvoices.map((i) => i.customer_id).filter((id): id is string => Boolean(id)))]
  const usedBranchIds = [...new Set(rawInvoices.map((i) => i.branch_id).filter((id): id is string => Boolean(id)))]

  const [{ data: customers }, { data: payments }, { data: branches }] = await Promise.all([
    customerIds.length > 0 ? supabase.from('customers').select('id, name').in('id', customerIds) : Promise.resolve({ data: null }),
    supabase.from('payments').select('invoice_id, amount').in('invoice_id', invoiceIds),
    usedBranchIds.length > 0 ? supabase.from('branches').select('id, name').in('id', usedBranchIds) : Promise.resolve({ data: null }),
  ])

  const customerMap = byId(customers ?? [])
  const branchMap = byId(branches ?? [])
  const paidTotals = new Map<string, number>()
  for (const payment of payments ?? []) {
    paidTotals.set(payment.invoice_id, (paidTotals.get(payment.invoice_id) ?? 0) + toNumber(payment.amount))
  }

  const data = rawInvoices.map((invoice) => {
    const paidAmount = paidTotals.get(invoice.id) ?? 0
    const total = toNumber(invoice.total)
    return {
      ...invoice,
      branch_name: invoice.branch_id ? (branchMap.get(invoice.branch_id)?.name ?? '—') : '—',
      customer_name: customerMap.get(invoice.customer_id)?.name ?? '—',
      paid_amount: paidAmount,
      balance_due: Number((total - paidAmount).toFixed(2)),
    }
  })

  return { data, total: count ?? 0 }
}

export async function getInvoiceById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let invoiceQuery = supabase.from('invoices').select('*').eq('company_id', companyId).eq('id', id)
  if (branchScope) {
    invoiceQuery = invoiceQuery.in('branch_id', branchScope)
  }
  let tripQuery = supabase.from('trips').select('id, public_id, branch_id, status, start_time, end_time, distance_km').eq('company_id', companyId)
  if (branchScope) {
    tripQuery = tripQuery.in('branch_id', branchScope)
  }

  const [{ data: company }, { data: invoice }, { data: customers }, { data: items }, { data: payments }, { data: trips }, { data: branches }, { data: settings }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
    invoiceQuery.maybeSingle(),
    supabase.from('customers').select('*').eq('company_id', companyId),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('description'),
    supabase.from('payments').select('*').eq('company_id', companyId).eq('invoice_id', id).order('payment_date', { ascending: false }),
    tripQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase
      .from('company_app_settings')
      .select('default_currency, invoice_footer, brand_accent, invoice_payment_instructions, invoice_logo_url')
      .eq('company_id', companyId)
      .maybeSingle(),
  ])

  const typedCompany = company as TableRow<'companies'> | null
  const typedInvoice = invoice as TableRow<'invoices'> | null
  if (!typedCompany || !typedInvoice) return null

  const customerMap = byId((customers ?? []) as TableRow<'customers'>[])
  const tripMap = byId((trips ?? []) as Array<TableRow<'trips'> & { id: string }>)
  const branchMap = byId(branches ?? [])

  return {
    company: typedCompany,
    invoice: typedInvoice,
    branch: typedInvoice.branch_id ? branchMap.get(typedInvoice.branch_id) ?? null : null,
    settings: {
      default_currency: settings?.default_currency ?? defaultCompanyAppSettings.default_currency,
      invoice_footer: settings?.invoice_footer ?? defaultCompanyAppSettings.invoice_footer,
      brand_accent: settings?.brand_accent ?? defaultCompanyAppSettings.brand_accent,
      invoice_payment_instructions:
        settings?.invoice_payment_instructions ?? defaultCompanyAppSettings.invoice_payment_instructions,
      invoice_logo_url: settings?.invoice_logo_url ?? defaultCompanyAppSettings.invoice_logo_url,
    },
    customer: customerMap.get(typedInvoice.customer_id) ?? null,
    items: (items ?? []) as TableRow<'invoice_items'>[],
    payments: (payments ?? []) as TableRow<'payments'>[],
    trip: typedInvoice.trip_id ? tripMap.get(typedInvoice.trip_id) ?? null : null,
  } satisfies InvoiceDetailBundle
}

export async function getInvoicePayments(invoiceId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('payments').select('*').eq('invoice_id', invoiceId).order('payment_date', { ascending: false })
  return data ?? []
}
