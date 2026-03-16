import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { canManageSettings } from '@/lib/auth/permissions'
import { stringifyCsvRows } from '@/lib/utils/csv'
import { toNumber } from '@/lib/utils/numbers'

type ExportResource = 'customers' | 'vehicles' | 'drivers' | 'invoices' | 'orders' | 'trips'

function isExportResource(value: string): value is ExportResource {
  return ['customers', 'vehicles', 'drivers', 'invoices', 'orders', 'trips'].includes(value)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params
  if (!isExportResource(resource)) {
    return Response.json({ error: 'Unsupported export resource.' }, { status: 404 })
  }

  const { supabase, membership, user } = await getCurrentMembership()
  if (!user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!membership?.company_id || !canManageSettings(membership.role)) {
    return Response.json({ error: 'Insufficient permissions.' }, { status: 403 })
  }

  const companyId = membership.company_id
  const branchScope = membership.branchIds.length > 0 ? membership.branchIds : null
  const { data: branches } = await supabase.from('branches').select('id, code, name').eq('company_id', companyId)
  const branchMap = new Map((branches ?? []).map((row) => [row.id, { code: row.code, name: row.name }]))
  let csv = ''

  if (resource === 'customers') {
    let query = supabase
      .from('customers')
      .select('branch_id, name, business_id, vat_number, email, phone, billing_address_line1, billing_address_line2, billing_postal_code, billing_city, billing_country, notes, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (branchScope) query = query.in('branch_id', branchScope)
    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        name: row.name,
        business_id: row.business_id,
        vat_number: row.vat_number,
        email: row.email,
        phone: row.phone,
        billing_address_line1: row.billing_address_line1,
        billing_address_line2: row.billing_address_line2,
        billing_postal_code: row.billing_postal_code,
        billing_city: row.billing_city,
        billing_country: row.billing_country,
        notes: row.notes,
        created_at: row.created_at,
      })),
    )
  }

  if (resource === 'vehicles') {
    let query = supabase
      .from('vehicles')
      .select('branch_id, registration_number, make, model, year, fuel_type, current_km, next_service_km, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (branchScope) query = query.in('branch_id', branchScope)
    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        registration_number: row.registration_number,
        make: row.make,
        model: row.model,
        year: row.year,
        fuel_type: row.fuel_type,
        current_km: row.current_km,
        next_service_km: row.next_service_km,
        is_active: row.is_active ? 'true' : 'false',
        created_at: row.created_at,
      })),
    )
  }

  if (resource === 'drivers') {
    let query = supabase
      .from('drivers')
      .select('branch_id, full_name, phone, email, license_type, employment_type, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (branchScope) query = query.in('branch_id', branchScope)
    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        full_name: row.full_name,
        phone: row.phone,
        email: row.email,
        license_type: row.license_type,
        employment_type: row.employment_type,
        is_active: row.is_active ? 'true' : 'false',
        created_at: row.created_at,
      })),
    )
  }

  if (resource === 'invoices') {
    const [{ data: invoices, error: invoiceError }, { data: customers }, { data: payments }] = await Promise.all([
      (() => {
        let query = supabase
          .from('invoices')
          .select('id, branch_id, invoice_number, customer_id, issue_date, due_date, status, subtotal, vat_total, total, reference_number, notes, created_at')
          .eq('company_id', companyId)
          .order('issue_date', { ascending: false })
        if (branchScope) query = query.in('branch_id', branchScope)
        return query
      })(),
      (() => {
        let query = supabase.from('customers').select('id, name').eq('company_id', companyId)
        if (branchScope) query = query.in('branch_id', branchScope)
        return query
      })(),
      (() => {
        let query = supabase.from('payments').select('invoice_id, amount').eq('company_id', companyId)
        return query
      })(),
    ])

    if (invoiceError) {
      return Response.json({ error: invoiceError.message }, { status: 500 })
    }

    const customerMap = new Map((customers ?? []).map((row) => [row.id, row.name]))
    const paymentTotals = new Map<string, number>()
    for (const payment of payments ?? []) {
      paymentTotals.set(payment.invoice_id, (paymentTotals.get(payment.invoice_id) ?? 0) + toNumber(payment.amount))
    }

    csv = stringifyCsvRows(
      (invoices ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        invoice_number: row.invoice_number,
        customer_name: customerMap.get(row.customer_id) ?? 'Unknown customer',
        issue_date: row.issue_date,
        due_date: row.due_date,
        status: row.status,
        subtotal: row.subtotal,
        vat_total: row.vat_total,
        total: row.total,
        paid_amount: paymentTotals.get(row.id)?.toFixed(2) ?? '0.00',
        reference_number: row.reference_number,
        notes: row.notes,
        created_at: row.created_at,
      })),
    )
  }

  if (resource === 'orders') {
    const [{ data: orders, error: ordersError }, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
      (() => {
        let query = supabase
          .from('transport_orders')
          .select('id, branch_id, order_number, customer_id, assigned_vehicle_id, assigned_driver_id, pickup_location, delivery_location, scheduled_at, status, cargo_description, notes, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        if (branchScope) query = query.in('branch_id', branchScope)
        return query
      })(),
      supabase.from('customers').select('id, name').eq('company_id', companyId),
      supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
      supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
    ])

    if (ordersError) return Response.json({ error: ordersError.message }, { status: 500 })

    const customerMap = new Map((customers ?? []).map((r) => [r.id, r.name]))
    const vehicleMap = new Map((vehicles ?? []).map((r) => [r.id, r.registration_number]))
    const driverMap = new Map((drivers ?? []).map((r) => [r.id, r.full_name]))

    csv = stringifyCsvRows(
      (orders ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        order_number: row.order_number,
        customer_name: customerMap.get(row.customer_id) ?? '',
        vehicle: row.assigned_vehicle_id ? (vehicleMap.get(row.assigned_vehicle_id) ?? '') : '',
        driver: row.assigned_driver_id ? (driverMap.get(row.assigned_driver_id) ?? '') : '',
        pickup_location: row.pickup_location,
        delivery_location: row.delivery_location,
        scheduled_at: row.scheduled_at ?? '',
        status: row.status,
        cargo_description: row.cargo_description ?? '',
        notes: row.notes ?? '',
        created_at: row.created_at,
      })),
    )
  }

  if (resource === 'trips') {
    const [{ data: trips, error: tripsError }, { data: customers }, { data: vehicles }, { data: drivers }] = await Promise.all([
      (() => {
        let query = supabase
          .from('trips')
          .select('id, public_id, branch_id, customer_id, vehicle_id, driver_id, start_time, end_time, distance_km, waiting_time_minutes, status, notes, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
        if (branchScope) query = query.in('branch_id', branchScope)
        return query
      })(),
      supabase.from('customers').select('id, name').eq('company_id', companyId),
      supabase.from('vehicles').select('id, registration_number').eq('company_id', companyId),
      supabase.from('drivers').select('id, full_name').eq('company_id', companyId),
    ])

    if (tripsError) return Response.json({ error: tripsError.message }, { status: 500 })

    const customerMap = new Map((customers ?? []).map((r) => [r.id, r.name]))
    const vehicleMap = new Map((vehicles ?? []).map((r) => [r.id, r.registration_number]))
    const driverMap = new Map((drivers ?? []).map((r) => [r.id, r.full_name]))

    csv = stringifyCsvRows(
      (trips ?? []).map((row) => ({
        branch_code: row.branch_id ? branchMap.get(row.branch_id)?.code ?? '' : '',
        branch_name: row.branch_id ? branchMap.get(row.branch_id)?.name ?? '' : '',
        trip_id: row.public_id ?? row.id,
        customer_name: customerMap.get(row.customer_id) ?? '',
        vehicle: row.vehicle_id ? (vehicleMap.get(row.vehicle_id) ?? '') : '',
        driver: row.driver_id ? (driverMap.get(row.driver_id) ?? '') : '',
        start_time: row.start_time ?? '',
        end_time: row.end_time ?? '',
        distance_km: row.distance_km ?? '',
        waiting_time_minutes: row.waiting_time_minutes ?? 0,
        status: row.status,
        notes: row.notes ?? '',
        created_at: row.created_at,
      })),
    )
  }

  const fileName = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
