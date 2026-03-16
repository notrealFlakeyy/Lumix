import type { DashboardStats, ProfitabilityBreakdown, TripProfitabilityRow } from '@/types/app'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { getCompanyAppSettings } from '@/lib/db/queries/company-settings'
import { estimateTripProfitability } from '@/lib/utils/profitability'
import { toNumber } from '@/lib/utils/numbers'

type TripProfitabilityDatasetRow = TripProfitabilityRow & {
  issuedAt: string | null
}

async function buildTripProfitabilityDataset(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<TripProfitabilityDatasetRow[]> {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let tripsQuery = supabase
    .from('trips')
    .select('id, public_id, branch_id, customer_id, vehicle_id, driver_id, start_time, end_time, distance_km, waiting_time_minutes, status')
    .eq('company_id', companyId)
  let invoicesQuery = supabase
    .from('invoices')
    .select('trip_id, branch_id, total, status, issue_date')
    .eq('company_id', companyId)
    .neq('status', 'cancelled')
  if (branchScope) {
    tripsQuery = tripsQuery.in('branch_id', branchScope)
    invoicesQuery = invoicesQuery.in('branch_id', branchScope)
  }
  const [settings, tripsResponse, invoicesResponse, customersResponse, vehiclesResponse, driversResponse] = await Promise.all([
    getCompanyAppSettings(companyId, supabase),
    tripsQuery,
    invoicesQuery,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
  ])

  const assumptions = {
    fuelCostPerKm: toNumber(settings?.fuel_cost_per_km ?? 0.42),
    maintenanceCostPerKm: toNumber(settings?.maintenance_cost_per_km ?? 0.18),
    driverCostPerHour: toNumber(settings?.driver_cost_per_hour ?? 32),
    waitingCostPerHour: toNumber(settings?.waiting_cost_per_hour ?? 24),
  }

  const customerMap = new Map((customersResponse.data ?? []).map((customer) => [customer.id, customer.name]))
  const vehicleMap = new Map(
    (vehiclesResponse.data ?? []).map((vehicle) => [
      vehicle.id,
      `${vehicle.registration_number}${vehicle.make || vehicle.model ? ` • ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : ''}`,
    ]),
  )
  const driverMap = new Map((driversResponse.data ?? []).map((driver) => [driver.id, driver.full_name]))
  const invoiceMap = new Map<string, { revenue: number; issuedAt: string | null }>()

  for (const invoice of invoicesResponse.data ?? []) {
    if (!invoice.trip_id) continue
    const current = invoiceMap.get(invoice.trip_id) ?? { revenue: 0, issuedAt: null }
    invoiceMap.set(invoice.trip_id, {
      revenue: current.revenue + toNumber(invoice.total),
      issuedAt: invoice.issue_date ?? current.issuedAt,
    })
  }

  return (tripsResponse.data ?? []).map((trip) => {
    const invoice = invoiceMap.get(trip.id) ?? { revenue: 0, issuedAt: null }
    const profitability = estimateTripProfitability(
      {
        revenue: invoice.revenue,
        distanceKm: trip.distance_km,
        waitingTimeMinutes: trip.waiting_time_minutes,
        startTime: trip.start_time,
        endTime: trip.end_time,
      },
      assumptions,
    )

    return {
      tripId: trip.id,
      tripReference: trip.public_id,
      customerName: customerMap.get(trip.customer_id) ?? 'Unknown customer',
      vehicleLabel: trip.vehicle_id ? vehicleMap.get(trip.vehicle_id) ?? 'Unassigned vehicle' : 'Unassigned vehicle',
      driverName: trip.driver_id ? driverMap.get(trip.driver_id) ?? 'Unassigned driver' : 'Unassigned driver',
      revenue: profitability.revenue,
      estimatedCost: profitability.estimatedCost,
      estimatedMargin: profitability.estimatedMargin,
      marginPercent: profitability.marginPercent,
      status: trip.status as TripProfitabilityRow['status'],
      issuedAt: invoice.issuedAt,
    }
  })
}

function aggregateProfitability(
  rows: TripProfitabilityDatasetRow[],
  getKey: (row: TripProfitabilityDatasetRow) => string,
  meta: string,
): ProfitabilityBreakdown[] {
  const map = new Map<string, { revenue: number; estimatedCost: number; estimatedMargin: number }>()

  for (const row of rows) {
    const key = getKey(row)
    const current = map.get(key) ?? { revenue: 0, estimatedCost: 0, estimatedMargin: 0 }
    map.set(key, {
      revenue: Number((current.revenue + row.revenue).toFixed(2)),
      estimatedCost: Number((current.estimatedCost + row.estimatedCost).toFixed(2)),
      estimatedMargin: Number((current.estimatedMargin + row.estimatedMargin).toFixed(2)),
    })
  }

  return Array.from(map.entries())
    .map(([label, values]) => ({
      label,
      revenue: values.revenue,
      estimatedCost: values.estimatedCost,
      estimatedMargin: values.estimatedMargin,
      marginPercent: values.revenue > 0 ? Number(((values.estimatedMargin / values.revenue) * 100).toFixed(1)) : null,
      meta,
    }))
    .sort((a, b) => b.estimatedMargin - a.estimatedMargin)
}

export async function getEstimatedProfitabilityStats(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<{
  totalRevenue: number
  totalEstimatedCost: number
  totalEstimatedMargin: number
}> {
  const rows = await buildTripProfitabilityDataset(companyId, client, branchIds)
  return rows.reduce(
    (totals, row) => ({
      totalRevenue: Number((totals.totalRevenue + row.revenue).toFixed(2)),
      totalEstimatedCost: Number((totals.totalEstimatedCost + row.estimatedCost).toFixed(2)),
      totalEstimatedMargin: Number((totals.totalEstimatedMargin + row.estimatedMargin).toFixed(2)),
    }),
    { totalRevenue: 0, totalEstimatedCost: 0, totalEstimatedMargin: 0 },
  )
}

export async function getEstimatedMarginByCustomer(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<ProfitabilityBreakdown[]> {
  return aggregateProfitability(await buildTripProfitabilityDataset(companyId, client, branchIds), (row) => row.customerName, 'Estimated gross margin by customer')
}

export async function getEstimatedMarginByVehicle(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<ProfitabilityBreakdown[]> {
  return aggregateProfitability(await buildTripProfitabilityDataset(companyId, client, branchIds), (row) => row.vehicleLabel, 'Estimated gross margin by vehicle')
}

export async function getEstimatedMarginByDriver(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<ProfitabilityBreakdown[]> {
  return aggregateProfitability(await buildTripProfitabilityDataset(companyId, client, branchIds), (row) => row.driverName, 'Estimated gross margin by driver')
}

export async function getTripProfitabilityRows(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<TripProfitabilityRow[]> {
  const rows = await buildTripProfitabilityDataset(companyId, client, branchIds)
  return rows.sort((a, b) => b.estimatedMargin - a.estimatedMargin)
}

export async function getDashboardProfitabilityStats(companyId: string, client?: DbClient, branchIds?: readonly string[] | null): Promise<Pick<DashboardStats, 'estimatedCostThisMonth' | 'estimatedMarginThisMonth'>> {
  const rows = await buildTripProfitabilityDataset(companyId, client, branchIds)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const monthRows = rows.filter((row) => row.issuedAt && row.issuedAt >= monthStart)

  return monthRows.reduce(
    (totals, row) => ({
      estimatedCostThisMonth: Number((totals.estimatedCostThisMonth + row.estimatedCost).toFixed(2)),
      estimatedMarginThisMonth: Number((totals.estimatedMarginThisMonth + row.estimatedMargin).toFixed(2)),
    }),
    { estimatedCostThisMonth: 0, estimatedMarginThisMonth: 0 },
  )
}

export async function getInvoiceStatusSummary(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase.from('invoices').select('status, total').eq('company_id', companyId)
  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  const { data } = await query
  const summary = new Map<string, { count: number; total: number }>()

  for (const invoice of data ?? []) {
    const current = summary.get(invoice.status) ?? { count: 0, total: 0 }
    summary.set(invoice.status, { count: current.count + 1, total: current.total + Number(invoice.total ?? 0) })
  }

  return Array.from(summary.entries()).map(([status, values]) => ({ status, ...values }))
}

export async function getTripVolumeOverTime(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase
    .from('trips')
    .select('created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }
  const { data } = await query

  const volume = new Map<string, number>()
  for (const trip of data ?? []) {
    const key = trip.created_at.slice(0, 7)
    volume.set(key, (volume.get(key) ?? 0) + 1)
  }

  return Array.from(volume.entries()).map(([period, count]) => ({ period, count }))
}
