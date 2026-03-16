import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listVehicles(
  companyId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
  page = 1,
  pageSize = 50,
  search?: string,
) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  const offset = (page - 1) * pageSize
  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('registration_number')
    .range(offset, offset + pageSize - 1)

  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  if (search) {
    query = query.or(`registration_number.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`)
  }

  const [{ data: vehicles, count }, { data: branches }] = await Promise.all([
    query,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  const data = ((vehicles ?? []) as TableRow<'vehicles'>[]).map((vehicle) => ({
    ...vehicle,
    branch_name: vehicle.branch_id ? (branchMap.get(vehicle.branch_id) ?? '—') : '—',
  }))

  return { data, total: count ?? 0 }
}

export async function getVehicleById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let vehicleQuery = supabase.from('vehicles').select('*').eq('company_id', companyId).eq('id', id)
  let ordersQuery = supabase
      .from('transport_orders')
      .select('id, branch_id, order_number, pickup_location, delivery_location, status')
      .eq('company_id', companyId)
      .eq('assigned_vehicle_id', id)
      .order('created_at', { ascending: false })
  let tripsQuery = supabase
      .from('trips')
      .select('id, public_id, branch_id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false })
  let invoicesQuery = supabase
      .from('invoices')
      .select('id, total, trip_id, branch_id')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
  if (branchScope) {
    vehicleQuery = vehicleQuery.in('branch_id', branchScope)
    ordersQuery = ordersQuery.in('branch_id', branchScope)
    tripsQuery = tripsQuery.in('branch_id', branchScope)
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }

  const [{ data: vehicle }, { data: orders }, { data: trips }, { data: invoices }, { data: branches }, { data: maintenanceLogs }] = await Promise.all([
    vehicleQuery.maybeSingle(),
    ordersQuery,
    tripsQuery,
    invoicesQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase
      .from('vehicle_maintenance')
      .select('id, type, description, performed_at, km_at_service, next_service_km, created_at')
      .eq('company_id', companyId)
      .eq('vehicle_id', id)
      .order('performed_at', { ascending: false }),
  ])

  const typedVehicle = vehicle as TableRow<'vehicles'> | null
  if (!typedVehicle) return null
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  const tripIds = new Set((trips ?? []).map((trip) => trip.id))
  const revenue = (invoices ?? [])
    .filter((invoice) => invoice.trip_id && tripIds.has(invoice.trip_id))
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)

  return {
    vehicle: {
      ...typedVehicle,
      branch_name: typedVehicle.branch_id ? branchMap.get(typedVehicle.branch_id) ?? 'Unknown branch' : 'No branch',
    },
    orders: (orders ?? []).map((order) => ({
      ...order,
      branch_name: order.branch_id ? branchMap.get(order.branch_id) ?? 'Unknown branch' : 'No branch',
    })),
    trips: (trips ?? []).map((trip) => ({
      ...trip,
      branch_name: trip.branch_id ? branchMap.get(trip.branch_id) ?? 'Unknown branch' : 'No branch',
    })),
    revenue,
    maintenanceLogs: maintenanceLogs ?? [],
  }
}
