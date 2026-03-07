import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'

export async function listOrders(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: orders }, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from('transport_orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])

  return ((orders ?? []) as TableRow<'transport_orders'>[]).map((order) => ({
    ...order,
    customer_name: customerMap.get(order.customer_id)?.name ?? 'Unknown customer',
    vehicle_name: order.assigned_vehicle_id ? vehicleMap.get(order.assigned_vehicle_id)?.registration_number ?? '-' : '-',
    driver_name: order.assigned_driver_id ? driverMap.get(order.assigned_driver_id)?.full_name ?? '-' : '-',
  }))
}

export async function getOrderById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: order }, { data: customers }, { data: vehicles }, { data: drivers }, { data: trip }] = await Promise.all([
    supabase.from('transport_orders').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase.from('customers').select('id, name, business_id, email, phone').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name, phone, email').eq('company_id', companyId),
    supabase
      .from('trips')
      .select('id, public_id, status, start_time, end_time, distance_km')
      .eq('company_id', companyId)
      .eq('transport_order_id', id)
      .limit(1)
      .maybeSingle(),
  ])

  const typedOrder = order as TableRow<'transport_orders'> | null
  if (!typedOrder) return null

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])

  return {
    order: typedOrder,
    customer: customerMap.get(typedOrder.customer_id) ?? null,
    vehicle: typedOrder.assigned_vehicle_id ? vehicleMap.get(typedOrder.assigned_vehicle_id) ?? null : null,
    driver: typedOrder.assigned_driver_id ? driverMap.get(typedOrder.assigned_driver_id) ?? null : null,
    trip,
  }
}
