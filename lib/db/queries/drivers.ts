import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { isUuid } from '@/lib/utils/public-ids'

export async function listDrivers(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase.from('drivers').select('*').eq('company_id', companyId).order('full_name')
  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  const [{ data: drivers }, { data: branches }] = await Promise.all([
    query,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  return ((drivers ?? []) as TableRow<'drivers'>[]).map((driver) => ({
    ...driver,
    branch_name: driver.branch_id ? branchMap.get(driver.branch_id) ?? 'Unknown branch' : 'No branch',
  }))
}

export async function getDriverById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let driverByPublicIdQuery = supabase.from('drivers').select('*').eq('company_id', companyId).eq('public_id', id)
  if (branchScope) {
    driverByPublicIdQuery = driverByPublicIdQuery.in('branch_id', branchScope)
  }
  const { data: driverByPublicId } = await driverByPublicIdQuery.maybeSingle()
  const driver =
    driverByPublicId ??
    (isUuid(id)
      ? (
          await (() => {
            let query = supabase.from('drivers').select('*').eq('company_id', companyId).eq('id', id)
            if (branchScope) {
              query = query.in('branch_id', branchScope)
            }
            return query.maybeSingle()
          })()
        ).data ?? null
      : null)

  const typedDriver = driver as TableRow<'drivers'> | null
  if (!typedDriver) return null

  let ordersQuery = supabase
      .from('transport_orders')
      .select('id, branch_id, order_number, pickup_location, delivery_location, status')
      .eq('company_id', companyId)
      .eq('assigned_driver_id', typedDriver.id)
      .order('created_at', { ascending: false })
  let tripsQuery = supabase
      .from('trips')
      .select('id, public_id, branch_id, start_time, end_time, distance_km, status')
      .eq('company_id', companyId)
      .eq('driver_id', typedDriver.id)
      .order('created_at', { ascending: false })
  let invoicesQuery = supabase
      .from('invoices')
      .select('id, total, trip_id, branch_id')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
  if (branchScope) {
    ordersQuery = ordersQuery.in('branch_id', branchScope)
    tripsQuery = tripsQuery.in('branch_id', branchScope)
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }

  const [{ data: orders }, { data: trips }, { data: invoices }, { data: branches }] = await Promise.all([
    ordersQuery,
    tripsQuery,
    invoicesQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.name]))

  const tripIds = new Set((trips ?? []).map((trip) => trip.id))
  const revenue = (invoices ?? [])
    .filter((invoice) => invoice.trip_id && tripIds.has(invoice.trip_id))
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0)

  return {
    driver: {
      ...typedDriver,
      branch_name: typedDriver.branch_id ? branchMap.get(typedDriver.branch_id) ?? 'Unknown branch' : 'No branch',
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
  }
}
