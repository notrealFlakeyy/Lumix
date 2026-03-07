import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'

export async function listTripDocuments(companyId: string, tripId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_type', 'trip')
    .eq('related_id', tripId)
    .order('created_at', { ascending: false })

  return (data ?? []) as TableRow<'documents'>[]
}

export async function listDriverDocuments(companyId: string, driverId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: trips }, { data: customers }] = await Promise.all([
    supabase.from('trips').select('id, customer_id, start_time, end_time, status').eq('company_id', companyId).eq('driver_id', driverId),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const typedTrips = (trips ?? []) as Array<Pick<TableRow<'trips'>, 'id' | 'customer_id' | 'start_time' | 'end_time' | 'status'>>
  if (typedTrips.length === 0) return []

  const customerMap = byId(customers ?? [])
  const tripMap = byId(typedTrips)

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_type', 'trip')
    .in(
      'related_id',
      typedTrips.map((trip) => trip.id),
    )
    .order('created_at', { ascending: false })

  return ((documents ?? []) as TableRow<'documents'>[]).map((document) => {
    const trip = document.related_id ? tripMap.get(document.related_id) ?? null : null

    return {
      ...document,
      trip_status: trip?.status ?? null,
      customer_name: trip ? customerMap.get(trip.customer_id)?.name ?? 'Unknown customer' : null,
      trip_start_time: trip?.start_time ?? null,
      trip_end_time: trip?.end_time ?? null,
    }
  })
}
