import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'

export async function listVehicles(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('vehicles').select('*').eq('company_id', companyId).order('registration_number')
  return (data ?? []) as TableRow<'vehicles'>[]
}

export async function getVehicleById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: vehicle }, { data: orders }, { data: trips }, { data: invoices }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase
      .from('transport_orders')
      .select('id, order_number, pickup_location, delivery_location, status')
      .eq('company_id', companyId)
      .eq('assigned_vehicle_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trips')
      .select('id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, total, trip_id')
      .eq('company_id', companyId)
      .neq('status', 'cancelled'),
  ])

  const typedVehicle = vehicle as TableRow<'vehicles'> | null
  if (!typedVehicle) return null

  const tripIds = new Set((trips ?? []).map((trip) => trip.id))
  const revenue = (invoices ?? [])
    .filter((invoice) => invoice.trip_id && tripIds.has(invoice.trip_id))
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)

  return {
    vehicle: typedVehicle,
    orders: orders ?? [],
    trips: trips ?? [],
    revenue,
  }
}
