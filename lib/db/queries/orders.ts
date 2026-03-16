import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listOrders(
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
  let ordersQuery = supabase
    .from('transport_orders')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (branchScope) {
    ordersQuery = ordersQuery.in('branch_id', branchScope)
  }
  if (search) {
    ordersQuery = ordersQuery.or(`order_number.ilike.%${search}%,pickup_location.ilike.%${search}%,delivery_location.ilike.%${search}%`)
  }
  if (status) {
    ordersQuery = ordersQuery.eq('status', status)
  }

  const [{ data: orders, count }, { data: customers }, { data: vehicles }, { data: drivers }, { data: branches }] = await Promise.all([
    ordersQuery,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])
  const branchMap = byId(branches ?? [])

  const data = ((orders ?? []) as TableRow<'transport_orders'>[]).map((order) => ({
    ...order,
    branch_name: order.branch_id ? (branchMap.get(order.branch_id)?.name ?? '—') : '—',
    customer_name: customerMap.get(order.customer_id)?.name ?? '—',
    vehicle_name: order.assigned_vehicle_id ? (vehicleMap.get(order.assigned_vehicle_id)?.registration_number ?? '—') : '—',
    driver_name: order.assigned_driver_id ? (driverMap.get(order.assigned_driver_id)?.full_name ?? '—') : '—',
  }))

  return { data, total: count ?? 0 }
}

export async function getOrderById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let orderQuery = supabase.from('transport_orders').select('*').eq('company_id', companyId).eq('id', id)
  if (branchScope) {
    orderQuery = orderQuery.in('branch_id', branchScope)
  }
  let tripQuery = supabase
    .from('trips')
    .select('id, public_id, branch_id, status, start_time, end_time, distance_km')
    .eq('company_id', companyId)
    .eq('transport_order_id', id)
    .limit(1)
  if (branchScope) {
    tripQuery = tripQuery.in('branch_id', branchScope)
  }

  const [{ data: order }, { data: customers }, { data: vehicles }, { data: drivers }, { data: trip }, { data: branches }] = await Promise.all([
    orderQuery.maybeSingle(),
    supabase.from('customers').select('id, name, business_id, email, phone').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name, phone, email').eq('company_id', companyId),
    tripQuery.maybeSingle(),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const typedOrder = order as TableRow<'transport_orders'> | null
  if (!typedOrder) return null

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])
  const branchMap = byId(branches ?? [])

  return {
    order: typedOrder,
    branch: typedOrder.branch_id ? branchMap.get(typedOrder.branch_id) ?? null : null,
    customer: customerMap.get(typedOrder.customer_id) ?? null,
    vehicle: typedOrder.assigned_vehicle_id ? vehicleMap.get(typedOrder.assigned_vehicle_id) ?? null : null,
    driver: typedOrder.assigned_driver_id ? driverMap.get(typedOrder.assigned_driver_id) ?? null : null,
    trip,
  }
}
