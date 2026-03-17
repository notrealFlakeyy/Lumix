import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listQuotes(
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

  let quotesQuery = supabase
    .from('sales_quotes')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (branchScope) {
    quotesQuery = quotesQuery.in('branch_id', branchScope)
  }

  if (search) {
    quotesQuery = quotesQuery.or(
      `quote_number.ilike.%${search}%,title.ilike.%${search}%,pickup_location.ilike.%${search}%,delivery_location.ilike.%${search}%`,
    )
  }

  if (status) {
    quotesQuery = quotesQuery.eq('status', status)
  }

  const [{ data: quotes, count }, { data: customers }, { data: branches }, { data: convertedOrders }] = await Promise.all([
    quotesQuery,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('transport_orders').select('id, order_number').eq('company_id', companyId),
  ])

  const customerMap = byId((customers ?? []) as Array<Pick<TableRow<'customers'>, 'id' | 'name'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const orderMap = byId((convertedOrders ?? []) as Array<Pick<TableRow<'transport_orders'>, 'id' | 'order_number'>>)

  const data = ((quotes ?? []) as TableRow<'sales_quotes'>[]).map((quote) => ({
    ...quote,
    customer_name: customerMap.get(quote.customer_id)?.name ?? '-',
    branch_name: quote.branch_id ? (branchMap.get(quote.branch_id)?.name ?? '-') : '-',
    converted_order_number: quote.converted_order_id ? (orderMap.get(quote.converted_order_id)?.order_number ?? null) : null,
  }))

  return { data, total: count ?? 0 }
}

export async function getQuoteById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let quoteQuery = supabase.from('sales_quotes').select('*').eq('company_id', companyId).eq('id', id)
  if (branchScope) {
    quoteQuery = quoteQuery.in('branch_id', branchScope)
  }

  const [{ data: quote }, { data: items }, { data: customers }, { data: branches }, { data: convertedOrders }] = await Promise.all([
    quoteQuery.maybeSingle(),
    supabase.from('sales_quote_items').select('*').eq('quote_id', id).order('id'),
    supabase.from('customers').select('id, name, business_id, email, phone').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('transport_orders').select('id, order_number').eq('company_id', companyId),
  ])

  const typedQuote = quote as TableRow<'sales_quotes'> | null
  if (!typedQuote) return null

  const customerMap = byId((customers ?? []) as Array<Pick<TableRow<'customers'>, 'id' | 'name' | 'business_id' | 'email' | 'phone'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const orderMap = byId((convertedOrders ?? []) as Array<Pick<TableRow<'transport_orders'>, 'id' | 'order_number'>>)

  return {
    quote: typedQuote,
    items: (items ?? []) as TableRow<'sales_quote_items'>[],
    customer: customerMap.get(typedQuote.customer_id) ?? null,
    branch: typedQuote.branch_id ? branchMap.get(typedQuote.branch_id) ?? null : null,
    convertedOrder: typedQuote.converted_order_id ? orderMap.get(typedQuote.converted_order_id) ?? null : null,
  }
}
