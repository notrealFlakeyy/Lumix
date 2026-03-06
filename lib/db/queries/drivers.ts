import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'

export async function listDrivers(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase.from('drivers').select('*').eq('company_id', companyId).order('full_name')
  return (data ?? []) as TableRow<'drivers'>[]
}

export async function getDriverById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: driver }, { data: orders }, { data: trips }, { data: invoices }] = await Promise.all([
    supabase.from('drivers').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase
      .from('transport_orders')
      .select('id, order_number, pickup_location, delivery_location, status')
      .eq('company_id', companyId)
      .eq('assigned_driver_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trips')
      .select('id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('driver_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, total, trip_id')
      .eq('company_id', companyId)
      .neq('status', 'cancelled'),
  ])

  const typedDriver = driver as TableRow<'drivers'> | null
  if (!typedDriver) return null

  const tripIds = new Set((trips ?? []).map((trip) => trip.id))
  const revenue = (invoices ?? [])
    .filter((invoice) => invoice.trip_id && tripIds.has(invoice.trip_id))
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)

  return {
    driver: typedDriver,
    orders: orders ?? [],
    trips: trips ?? [],
    revenue,
  }
}
