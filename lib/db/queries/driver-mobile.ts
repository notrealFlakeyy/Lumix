import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'

type DriverTripPresentation = TableRow<'trips'> & {
  customer_name: string
  vehicle_name: string
  order_number: string | null
  pickup_location: string | null
  delivery_location: string | null
  scheduled_at: string | null
  order_status: string | null
  invoice_number: string | null
  invoice_status: string | null
}

export async function getDriverMobileTrips(companyId: string, driverId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: trips }, { data: customers }, { data: vehicles }, { data: orders }, { data: invoices }] = await Promise.all([
    supabase.from('trips').select('*').eq('company_id', companyId).eq('driver_id', driverId),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase
      .from('transport_orders')
      .select('id, order_number, pickup_location, delivery_location, scheduled_at, status')
      .eq('company_id', companyId),
    supabase.from('invoices').select('id, invoice_number, trip_id, status').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const orderMap = byId(orders ?? [])
  const invoiceByTripId = new Map(((invoices ?? []) as TableRow<'invoices'>[]).filter((invoice) => invoice.trip_id).map((invoice) => [invoice.trip_id as string, invoice]))

  return ((trips ?? []) as TableRow<'trips'>[])
    .map((trip) => {
      const order = trip.transport_order_id ? orderMap.get(trip.transport_order_id) ?? null : null
      const vehicle = trip.vehicle_id ? vehicleMap.get(trip.vehicle_id) ?? null : null
      const invoice = invoiceByTripId.get(trip.id) ?? null

      return {
        ...trip,
        customer_name: customerMap.get(trip.customer_id)?.name ?? 'Unknown customer',
        vehicle_name: vehicle ? [vehicle.registration_number, vehicle.make, vehicle.model].filter(Boolean).join(' ') : 'Unassigned vehicle',
        order_number: order?.order_number ?? null,
        pickup_location: order?.pickup_location ?? null,
        delivery_location: order?.delivery_location ?? null,
        scheduled_at: order?.scheduled_at ?? trip.start_time,
        order_status: order?.status ?? null,
        invoice_number: invoice?.invoice_number ?? null,
        invoice_status: invoice?.status ?? null,
      }
    })
    .sort((left, right) => {
      const leftValue = new Date(left.scheduled_at ?? left.start_time ?? left.created_at).getTime()
      const rightValue = new Date(right.scheduled_at ?? right.start_time ?? right.created_at).getTime()
      return leftValue - rightValue
    })
}

export async function getDriverMobileTripById(companyId: string, driverId: string, tripId: string, client?: DbClient) {
  const trips = (await getDriverMobileTrips(companyId, driverId, client)) as DriverTripPresentation[]
  return trips.find((trip) => trip.public_id === tripId || trip.id === tripId) ?? null
}
