import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listTripDocuments(companyId: string, tripId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_type', 'trip')
    .eq('related_id', tripId)
    .order('created_at', { ascending: false })

  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }

  const { data } = await query

  return (data ?? []) as TableRow<'documents'>[]
}

export async function listDriverDocuments(companyId: string, driverId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let tripsQuery = supabase.from('trips').select('id, branch_id, customer_id, start_time, end_time, status').eq('company_id', companyId).eq('driver_id', driverId)
  let customersQuery = supabase.from('customers').select('id, name').eq('company_id', companyId)

  if (branchScope) {
    tripsQuery = tripsQuery.in('branch_id', branchScope)
    customersQuery = customersQuery.in('branch_id', branchScope)
  }

  const [{ data: trips }, { data: customers }] = await Promise.all([
    tripsQuery,
    customersQuery,
  ])

  const typedTrips = (trips ?? []) as Array<Pick<TableRow<'trips'>, 'id' | 'branch_id' | 'customer_id' | 'start_time' | 'end_time' | 'status'>>
  if (typedTrips.length === 0) return []

  const customerMap = byId(customers ?? [])
  const tripMap = byId(typedTrips)

  let documentsQuery = supabase
    .from('documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('related_type', 'trip')
    .in(
      'related_id',
      typedTrips.map((trip) => trip.id),
    )
    .order('created_at', { ascending: false })

  if (branchScope) {
    documentsQuery = documentsQuery.in('branch_id', branchScope)
  }

  const { data: documents } = await documentsQuery

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
