import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { isUuid } from '@/lib/utils/public-ids'

export async function listTrips(
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
  let tripsQuery = supabase
    .from('trips')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)
  if (branchScope) {
    tripsQuery = tripsQuery.in('branch_id', branchScope)
  }
  if (search) {
    tripsQuery = tripsQuery.ilike('public_id', `%${search}%`)
  }
  if (status) {
    tripsQuery = tripsQuery.eq('status', status)
  }

  const [{ data: trips, count }, { data: customers }, { data: vehicles }, { data: drivers }, { data: branches }] = await Promise.all([
    tripsQuery,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])
  const branchMap = byId(branches ?? [])

  const data = ((trips ?? []) as TableRow<'trips'>[]).map((trip) => ({
    ...trip,
    branch_name: trip.branch_id ? (branchMap.get(trip.branch_id)?.name ?? '—') : '—',
    customer_name: customerMap.get(trip.customer_id)?.name ?? '—',
    vehicle_name: trip.vehicle_id ? (vehicleMap.get(trip.vehicle_id)?.registration_number ?? '—') : '—',
    driver_name: trip.driver_id ? (driverMap.get(trip.driver_id)?.full_name ?? '—') : '—',
  }))

  return { data, total: count ?? 0 }
}

export async function getTripById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let tripByPublicIdQuery = supabase.from('trips').select('*').eq('company_id', companyId).eq('public_id', id)
  if (branchScope) {
    tripByPublicIdQuery = tripByPublicIdQuery.in('branch_id', branchScope)
  }
  const { data: tripByPublicId } = await tripByPublicIdQuery.maybeSingle()
  let tripById = null
  if (!tripByPublicId && isUuid(id)) {
    let tripByIdQuery = supabase.from('trips').select('*').eq('company_id', companyId).eq('id', id)
    if (branchScope) {
      tripByIdQuery = tripByIdQuery.in('branch_id', branchScope)
    }
    tripById = (await tripByIdQuery.maybeSingle()).data ?? null
  }
  const trip =
    tripByPublicId ?? tripById

  const typedTrip = trip as TableRow<'trips'> | null
  if (!typedTrip) return null

  let invoiceQuery = supabase.from('invoices').select('id, branch_id, invoice_number, status, total, due_date, trip_id').eq('company_id', companyId)
  if (branchScope) {
    invoiceQuery = invoiceQuery.in('branch_id', branchScope)
  }

  const [{ data: customers }, { data: vehicles }, { data: drivers }, { data: orders }, { data: invoices }, { data: branches }] = await Promise.all([
    supabase.from('customers').select('id, name, business_id, email, phone').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase.from('drivers').select('id, public_id, full_name, phone, email').eq('company_id', companyId),
    supabase.from('transport_orders').select('id, branch_id, order_number, status').eq('company_id', companyId),
    invoiceQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const vehicleMap = byId(vehicles ?? [])
  const driverMap = byId(drivers ?? [])
  const orderMap = byId(orders ?? [])
  const branchMap = byId(branches ?? [])
  const linkedInvoice = (invoices as TableRow<'invoices'>[] | null)?.find((invoice) => invoice.trip_id === typedTrip.id) ?? null

  return {
    trip: typedTrip,
    branch: typedTrip.branch_id ? branchMap.get(typedTrip.branch_id) ?? null : null,
    customer: customerMap.get(typedTrip.customer_id) ?? null,
    vehicle: typedTrip.vehicle_id ? vehicleMap.get(typedTrip.vehicle_id) ?? null : null,
    driver: typedTrip.driver_id ? driverMap.get(typedTrip.driver_id) ?? null : null,
    order: typedTrip.transport_order_id ? orderMap.get(typedTrip.transport_order_id) ?? null : null,
    invoice: linkedInvoice,
  }
}
