import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { isUuid } from '@/lib/utils/public-ids'

export async function listTrips(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: trips }, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase.from('trips').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])

  return ((trips ?? []) as TableRow<'trips'>[]).map((trip) => ({
    ...trip,
    customer_name: customerMap.get(trip.customer_id)?.name ?? 'Unknown customer',
    vehicle_name: trip.vehicle_id ? vehicleMap.get(trip.vehicle_id)?.registration_number ?? '-' : '-',
    driver_name: trip.driver_id ? driverMap.get(trip.driver_id)?.full_name ?? '-' : '-',
  }))
}

export async function getTripById(companyId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: tripByPublicId } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('public_id', id).maybeSingle()
  const trip =
    tripByPublicId ??
    (isUuid(id) ? (await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()).data ?? null : null)

  const typedTrip = trip as TableRow<'trips'> | null
  if (!typedTrip) return null

  const [{ data: customers }, { data: vehicles }, { data: drivers }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from('customers').select('id, name, business_id, email, phone').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase.from('drivers').select('id, public_id, full_name, phone, email').eq('company_id', companyId),
    supabase.from('transport_orders').select('id, order_number, status').eq('company_id', companyId),
    supabase.from('invoices').select('id, invoice_number, status, total, due_date, trip_id').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])
  const orderMap = byId(orders ?? [])
  const linkedInvoice = (invoices as TableRow<'invoices'>[] | null)?.find((invoice) => invoice.trip_id === typedTrip.id) ?? null

  return {
    trip: typedTrip,
    customer: customerMap.get(typedTrip.customer_id) ?? null,
    vehicle: typedTrip.vehicle_id ? vehicleMap.get(typedTrip.vehicle_id) ?? null : null,
    driver: typedTrip.driver_id ? driverMap.get(typedTrip.driver_id) ?? null : null,
    order: typedTrip.transport_order_id ? orderMap.get(typedTrip.transport_order_id) ?? null : null,
    invoice: linkedInvoice,
  }
}
