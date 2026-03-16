import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listCustomers(
  companyId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
  page = 1,
  pageSize = 50,
  search?: string,
) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  const offset = (page - 1) * pageSize
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('name')
    .range(offset, offset + pageSize - 1)

  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,business_id.ilike.%${search}%`)
  }

  const [{ data: customers, count }, { data: branches }] = await Promise.all([
    query,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  const data = ((customers ?? []) as TableRow<'customers'>[]).map((customer) => ({
    ...customer,
    branch_name: customer.branch_id ? (branchMap.get(customer.branch_id) ?? '—') : '—',
  }))

  return { data, total: count ?? 0 }
}

export async function getCustomerById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let customerQuery = supabase.from('customers').select('*').eq('company_id', companyId).eq('id', id)
  let ordersQuery = supabase
      .from('transport_orders')
      .select('id, branch_id, order_number, pickup_location, delivery_location, status, scheduled_at')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
  let tripsQuery = supabase
      .from('trips')
      .select('id, public_id, branch_id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
  let invoicesQuery = supabase
      .from('invoices')
      .select('id, branch_id, invoice_number, issue_date, due_date, total, status')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false })

  if (branchScope) {
    customerQuery = customerQuery.in('branch_id', branchScope)
    ordersQuery = ordersQuery.in('branch_id', branchScope)
    tripsQuery = tripsQuery.in('branch_id', branchScope)
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }

  const [{ data: customer }, { data: orders }, { data: trips }, { data: invoices }, { data: branches }] = await Promise.all([
    customerQuery.maybeSingle(),
    ordersQuery,
    tripsQuery,
    invoicesQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const typedCustomer = customer as TableRow<'customers'> | null
  if (!typedCustomer) return null
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  return {
    customer: {
      ...typedCustomer,
      branch_name: typedCustomer.branch_id ? branchMap.get(typedCustomer.branch_id) ?? 'Unknown branch' : 'No branch',
    },
    orders: (orders ?? []).map((order) => ({
      ...order,
      branch_name: order.branch_id ? branchMap.get(order.branch_id) ?? 'Unknown branch' : 'No branch',
    })),
    trips: (trips ?? []).map((trip) => ({
      ...trip,
      branch_name: trip.branch_id ? branchMap.get(trip.branch_id) ?? 'Unknown branch' : 'No branch',
    })),
    invoices: (invoices ?? []).map((invoice) => ({
      ...invoice,
      branch_name: invoice.branch_id ? branchMap.get(invoice.branch_id) ?? 'Unknown branch' : 'No branch',
    })),
  }
}
