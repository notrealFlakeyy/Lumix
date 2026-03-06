import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'

export async function listCustomers(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('customers').select('*').eq('company_id', companyId).order('name')
  return (data ?? []) as TableRow<'customers'>[]
}

export async function getCustomerById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: customer }, { data: orders }, { data: trips }, { data: invoices }] = await Promise.all([
    supabase.from('customers').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase
      .from('transport_orders')
      .select('id, order_number, pickup_location, delivery_location, status, scheduled_at')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trips')
      .select('id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, total, status')
      .eq('company_id', companyId)
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  const typedCustomer = customer as TableRow<'customers'> | null
  if (!typedCustomer) return null

  return {
    customer: typedCustomer,
    orders: orders ?? [],
    trips: trips ?? [],
    invoices: invoices ?? [],
  }
}
