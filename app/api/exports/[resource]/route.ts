import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { canManageSettings } from '@/lib/auth/permissions'
import { stringifyCsvRows } from '@/lib/utils/csv'
import { toNumber } from '@/lib/utils/numbers'

type ExportResource = 'customers' | 'vehicles' | 'drivers' | 'invoices'

function isExportResource(value: string): value is ExportResource {
  return value === 'customers' || value === 'vehicles' || value === 'drivers' || value === 'invoices'
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
  let csv = ''

  if (resource === 'customers') {
    const { data, error } = await supabase
      .from('customers')
      .select('name, business_id, vat_number, email, phone, billing_address_line1, billing_address_line2, billing_postal_code, billing_city, billing_country, notes, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
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
    const { data, error } = await supabase
      .from('vehicles')
      .select('registration_number, make, model, year, fuel_type, current_km, next_service_km, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
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
    const { data, error } = await supabase
      .from('drivers')
      .select('full_name, phone, email, license_type, employment_type, is_active, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    csv = stringifyCsvRows(
      (data ?? []).map((row) => ({
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
      supabase
        .from('invoices')
        .select('id, invoice_number, customer_id, issue_date, due_date, status, subtotal, vat_total, total, reference_number, notes, created_at')
        .eq('company_id', companyId)
        .order('issue_date', { ascending: false }),
      supabase.from('customers').select('id, name').eq('company_id', companyId),
      supabase.from('payments').select('invoice_id, amount').eq('company_id', companyId),
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
