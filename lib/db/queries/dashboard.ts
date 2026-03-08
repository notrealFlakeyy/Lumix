import type { DashboardStats, RecentInvoice, RecentOrder, RevenueBreakdown } from '@/types/app'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { getDashboardProfitabilityStats } from '@/lib/db/queries/reports'
import { toNumber } from '@/lib/utils/numbers'

export async function getDashboardStats(companyId: string, client?: DbClient): Promise<DashboardStats> {
  const supabase = await getDbClient(client)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)

  const [{ data: invoices }, { count: activeOrders }, { count: completedTrips }, profitabilityStats] = await Promise.all([
    supabase
      .from('invoices')
      .select('total, issue_date, status, due_date')
      .eq('company_id', companyId)
      .neq('status', 'cancelled'),
    supabase
      .from('transport_orders')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['planned', 'assigned', 'in_progress']),
    supabase
      .from('trips')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['completed', 'invoiced'])
      .gte('updated_at', `${monthStart}T00:00:00.000Z`),
    getDashboardProfitabilityStats(companyId, supabase),
  ])

  const revenueThisMonth = (invoices ?? [])
    .filter((invoice) => invoice.issue_date >= monthStart)
    .reduce((sum, invoice) => sum + toNumber(invoice.total), 0)

  const overdueInvoices = (invoices ?? []).filter((invoice) => invoice.due_date < today && invoice.status !== 'paid').length

  return {
    revenueThisMonth,
    estimatedCostThisMonth: profitabilityStats.estimatedCostThisMonth,
    estimatedMarginThisMonth: profitabilityStats.estimatedMarginThisMonth,
    activeOrders: activeOrders ?? 0,
    completedTripsThisMonth: completedTrips ?? 0,
    overdueInvoices,
  }
}

export async function getRevenueByCustomer(companyId: string, client?: DbClient): Promise<RevenueBreakdown[]> {
  const supabase = await getDbClient(client)
  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase.from('invoices').select('customer_id, total').eq('company_id', companyId).neq('status', 'cancelled'),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer.name]))
  const totals = new Map<string, number>()

  for (const invoice of invoices ?? []) {
    const label = customerMap.get(invoice.customer_id) ?? 'Unknown customer'
    totals.set(label, (totals.get(label) ?? 0) + toNumber(invoice.total))
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export async function getRevenueByVehicle(companyId: string, client?: DbClient): Promise<RevenueBreakdown[]> {
  const supabase = await getDbClient(client)
  const [{ data: trips }, { data: invoices }, { data: vehicles }] = await Promise.all([
    supabase.from('trips').select('id, vehicle_id').eq('company_id', companyId),
    supabase.from('invoices').select('trip_id, total').eq('company_id', companyId).neq('status', 'cancelled'),
    supabase.from('vehicles').select('id, registration_number, make, model').eq('company_id', companyId),
  ])

  const tripVehicleMap = new Map((trips ?? []).map((trip) => [trip.id, trip.vehicle_id]))
  const vehicleMap = new Map(
    (vehicles ?? []).map((vehicle) => [
      vehicle.id,
      `${vehicle.registration_number}${vehicle.make || vehicle.model ? ` • ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : ''}`,
    ]),
  )
  const totals = new Map<string, number>()

  for (const invoice of invoices ?? []) {
    const vehicleId = invoice.trip_id ? tripVehicleMap.get(invoice.trip_id) : null
    const label = vehicleId ? vehicleMap.get(vehicleId) ?? 'Unassigned vehicle' : 'Unassigned vehicle'
    totals.set(label, (totals.get(label) ?? 0) + toNumber(invoice.total))
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value, meta: 'Estimated revenue by vehicle' }))
    .sort((a, b) => b.value - a.value)
}

export async function getRevenueByDriver(companyId: string, client?: DbClient): Promise<RevenueBreakdown[]> {
  const supabase = await getDbClient(client)
  const [{ data: trips }, { data: invoices }, { data: drivers }] = await Promise.all([
    supabase.from('trips').select('id, driver_id').eq('company_id', companyId),
    supabase.from('invoices').select('trip_id, total').eq('company_id', companyId).neq('status', 'cancelled'),
    supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
  ])

  const tripDriverMap = new Map((trips ?? []).map((trip) => [trip.id, trip.driver_id]))
  const driverMap = new Map((drivers ?? []).map((driver) => [driver.id, driver.full_name]))
  const totals = new Map<string, number>()

  for (const invoice of invoices ?? []) {
    const driverId = invoice.trip_id ? tripDriverMap.get(invoice.trip_id) : null
    const label = driverId ? driverMap.get(driverId) ?? 'Unassigned driver' : 'Unassigned driver'
    totals.set(label, (totals.get(label) ?? 0) + toNumber(invoice.total))
  }

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value, meta: 'Estimated revenue by driver' }))
    .sort((a, b) => b.value - a.value)
}

export async function getRecentOrders(companyId: string, client?: DbClient): Promise<RecentOrder[]> {
  const supabase = await getDbClient(client)
  const [{ data: orders }, { data: customers }] = await Promise.all([
    supabase
      .from('transport_orders')
      .select('id, order_number, customer_id, pickup_location, delivery_location, status, scheduled_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer.name]))
  return (orders ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    customerName: customerMap.get(order.customer_id) ?? 'Unknown customer',
    pickupLocation: order.pickup_location,
    deliveryLocation: order.delivery_location,
    status: order.status as RecentOrder['status'],
    scheduledAt: order.scheduled_at,
  }))
}

export async function getRecentInvoices(companyId: string, client?: DbClient): Promise<RecentInvoice[]> {
  const supabase = await getDbClient(client)
  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, total, status, due_date')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = new Map((customers ?? []).map((customer) => [customer.id, customer.name]))
  return (invoices ?? []).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    customerName: customerMap.get(invoice.customer_id) ?? 'Unknown customer',
    total: toNumber(invoice.total),
    status: invoice.status as RecentInvoice['status'],
    dueDate: invoice.due_date,
  }))
}
