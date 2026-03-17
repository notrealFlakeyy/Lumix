'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export type SearchResultType = 'customer' | 'order' | 'invoice' | 'vehicle' | 'driver'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  href: string
}

export async function globalSearch(
  companyId: string,
  query: string,
  branchIds: string[] | null,
  locale: string,
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const supabase = await createSupabaseServerClient()
  const branchScope = normalizeBranchScope(branchIds)
  const pattern = `%${trimmed}%`

  // Customers
  let customersQuery = supabase
    .from('customers')
    .select('id, name, email, business_id')
    .eq('company_id', companyId)
    .or(`name.ilike.${pattern},email.ilike.${pattern},business_id.ilike.${pattern}`)
    .limit(5)
  if (branchScope) {
    customersQuery = customersQuery.in('branch_id', branchScope)
  }

  // Orders
  let ordersQuery = supabase
    .from('transport_orders')
    .select('id, order_number, pickup_location, delivery_location')
    .eq('company_id', companyId)
    .or(`order_number.ilike.${pattern},pickup_location.ilike.${pattern},delivery_location.ilike.${pattern}`)
    .limit(5)
  if (branchScope) {
    ordersQuery = ordersQuery.in('branch_id', branchScope)
  }

  // Invoices
  let invoicesQuery = supabase
    .from('invoices')
    .select('id, invoice_number, total, status')
    .eq('company_id', companyId)
    .ilike('invoice_number', pattern)
    .limit(5)
  if (branchScope) {
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }

  // Vehicles
  let vehiclesQuery = supabase
    .from('vehicles')
    .select('id, registration_number, make, model')
    .eq('company_id', companyId)
    .or(`registration_number.ilike.${pattern},make.ilike.${pattern},model.ilike.${pattern}`)
    .limit(5)
  if (branchScope) {
    vehiclesQuery = vehiclesQuery.in('branch_id', branchScope)
  }

  // Drivers
  let driversQuery = supabase
    .from('drivers')
    .select('id, full_name, phone, email')
    .eq('company_id', companyId)
    .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
    .limit(5)
  if (branchScope) {
    driversQuery = driversQuery.in('branch_id', branchScope)
  }

  const [{ data: customers }, { data: orders }, { data: invoices }, { data: vehicles }, { data: drivers }] =
    await Promise.all([customersQuery, ordersQuery, invoicesQuery, vehiclesQuery, driversQuery])

  const results: SearchResult[] = []

  for (const c of customers ?? []) {
    results.push({
      type: 'customer',
      id: c.id,
      title: c.name,
      subtitle: [c.email, c.business_id].filter(Boolean).join(' | '),
      href: `/${locale}/customers/${c.id}`,
    })
  }

  for (const o of orders ?? []) {
    results.push({
      type: 'order',
      id: o.id,
      title: o.order_number,
      subtitle: [o.pickup_location, o.delivery_location].filter(Boolean).join(' -> '),
      href: `/${locale}/orders/${o.id}`,
    })
  }

  for (const i of invoices ?? []) {
    results.push({
      type: 'invoice',
      id: i.id,
      title: i.invoice_number,
      subtitle: `${i.status} | ${i.total}`,
      href: `/${locale}/invoices/${i.id}`,
    })
  }

  for (const v of vehicles ?? []) {
    results.push({
      type: 'vehicle',
      id: v.id,
      title: v.registration_number,
      subtitle: [v.make, v.model].filter(Boolean).join(' '),
      href: `/${locale}/vehicles/${v.id}`,
    })
  }

  for (const d of drivers ?? []) {
    results.push({
      type: 'driver',
      id: d.id,
      title: d.full_name,
      subtitle: [d.phone, d.email].filter(Boolean).join(' | '),
      href: `/${locale}/drivers/${d.id}`,
    })
  }

  return results
}
