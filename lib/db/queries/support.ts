import { getDbClient, type DbClient } from '@/lib/db/shared'

export type CompanyDiagnostics = {
  counts: {
    customers: number
    vehicles: number
    drivers: number
    orders: number
    trips: number
    invoices: number
    payments: number
    documents: number
  }
  quality: {
    customersMissingEmail: number
    activeDriversUnlinked: number
    activeDriversMissingEmail: number
    overdueInvoices: number
    startedTripsWithoutDriver: number
    sentInvoicesWithoutPdfUrl: number
  }
  duplicates: {
    customers: Array<{
      key: string
      reason: string
      entries: Array<{ id: string; label: string; secondaryLabel?: string | null }>
    }>
    vehicles: Array<{
      key: string
      reason: string
      entries: Array<{ id: string; label: string; secondaryLabel?: string | null }>
    }>
    drivers: Array<{
      key: string
      reason: string
      entries: Array<{ id: string; label: string; secondaryLabel?: string | null }>
    }>
  }
  cleanupQueue: Array<{
    entityType: 'customer' | 'vehicle' | 'driver'
    id: string
    label: string
    issue: string
    detail?: string | null
  }>
  recency: {
    lastOrderCreatedAt: string | null
    lastTripCreatedAt: string | null
    lastInvoiceCreatedAt: string | null
    lastPaymentCreatedAt: string | null
  }
}

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function getPresenceScore(values: Array<string | number | boolean | null | undefined>) {
  return values.reduce<number>((score, value) => {
    if (typeof value === 'boolean') {
      return score + (value ? 1 : 0)
    }

    if (typeof value === 'number') {
      return score + (Number.isFinite(value) ? 1 : 0)
    }

    return score + (value !== null && value !== undefined && String(value).trim().length > 0 ? 1 : 0)
  }, 0)
}

function buildDuplicateGroups<T extends { id: string }>(
  rows: T[],
  getKey: (row: T) => string,
  getEntry: (row: T) => { id: string; label: string; secondaryLabel?: string | null },
  sortEntries: (entries: Array<{ id: string; label: string; secondaryLabel?: string | null }>) => Array<{ id: string; label: string; secondaryLabel?: string | null }>,
  reason: string,
) {
  const map = new Map<string, Array<{ id: string; label: string; secondaryLabel?: string | null }>>()

  for (const row of rows) {
    const key = getKey(row)
    if (!key) continue
    const current = map.get(key) ?? []
    current.push(getEntry(row))
    map.set(key, current)
  }

  return Array.from(map.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({ key, reason, entries: sortEntries(entries) }))
}

export async function getCompanyDiagnostics(companyId: string, client?: DbClient): Promise<CompanyDiagnostics> {
  const supabase = await getDbClient(client)
  const today = new Date().toISOString().slice(0, 10)

  const [
    { count: customers },
    { count: vehicles },
    { count: drivers },
    { count: orders },
    { count: trips },
    { count: invoices },
    { count: payments },
    { count: documents },
    { count: customersMissingEmail },
    { count: activeDriversUnlinked },
    { count: activeDriversMissingEmail },
    { count: overdueInvoices },
    { count: startedTripsWithoutDriver },
    { count: sentInvoicesWithoutPdfUrl },
    { data: customerRows },
    { data: vehicleRows },
    { data: driverRows },
    { data: lastOrderRows },
    { data: lastTripRows },
    { data: lastInvoiceRows },
    { data: lastPaymentRows },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('transport_orders').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).or('email.is.null,email.eq.'),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).is('auth_user_id', null),
    supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).or('email.is.null,email.eq.'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId).lt('due_date', today).neq('status', 'paid').neq('status', 'cancelled'),
    supabase.from('trips').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'started').is('driver_id', null),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'sent').or('pdf_url.is.null,pdf_url.eq.'),
    supabase.from('customers').select('id, name, business_id, vat_number, email, phone, billing_address_line1, billing_postal_code, billing_city, notes').eq('company_id', companyId).order('created_at'),
    supabase.from('vehicles').select('id, registration_number, make, model, year, fuel_type, next_service_km, is_active').eq('company_id', companyId).order('created_at'),
    supabase.from('drivers').select('id, full_name, email, phone, auth_user_id, license_type, employment_type, is_active').eq('company_id', companyId).order('created_at'),
    supabase.from('transport_orders').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('trips').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('invoices').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('payments').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
  ])

  const customerCompleteness = new Map(
    (customerRows ?? []).map((row) => [
      row.id,
      getPresenceScore([row.business_id, row.vat_number, row.email, row.phone, row.billing_address_line1, row.billing_postal_code, row.billing_city, row.notes]),
    ]),
  )
  const vehicleCompleteness = new Map(
    (vehicleRows ?? []).map((row) => [
      row.id,
      getPresenceScore([row.make, row.model, row.year, row.fuel_type, row.next_service_km, row.is_active]),
    ]),
  )
  const driverCompleteness = new Map(
    (driverRows ?? []).map((row) => [
      row.id,
      getPresenceScore([row.auth_user_id, row.email, row.phone, row.license_type, row.employment_type, row.is_active]),
    ]),
  )

  const duplicateCustomers = [
    ...buildDuplicateGroups(
      customerRows ?? [],
      (row) => normalizeValue(row.business_id),
      (row) => ({ id: row.id, label: row.name, secondaryLabel: row.business_id }),
      (entries) => [...entries].sort((a, b) => (customerCompleteness.get(b.id) ?? 0) - (customerCompleteness.get(a.id) ?? 0)),
      'Same business ID',
    ),
    ...buildDuplicateGroups(
      customerRows ?? [],
      (row) => normalizeValue(row.email),
      (row) => ({ id: row.id, label: row.name, secondaryLabel: row.email }),
      (entries) => [...entries].sort((a, b) => (customerCompleteness.get(b.id) ?? 0) - (customerCompleteness.get(a.id) ?? 0)),
      'Same billing email',
    ),
    ...buildDuplicateGroups(
      customerRows ?? [],
      (row) => normalizeValue(row.name),
      (row) => ({ id: row.id, label: row.name, secondaryLabel: row.email }),
      (entries) => [...entries].sort((a, b) => (customerCompleteness.get(b.id) ?? 0) - (customerCompleteness.get(a.id) ?? 0)),
      'Same customer name',
    ),
  ].slice(0, 6)

  const duplicateVehicles = buildDuplicateGroups(
    vehicleRows ?? [],
    (row) => normalizeValue(row.registration_number),
    (row) => ({
      id: row.id,
      label: row.registration_number,
      secondaryLabel: [row.make, row.model].filter(Boolean).join(' ') || null,
    }),
    (entries) => [...entries].sort((a, b) => (vehicleCompleteness.get(b.id) ?? 0) - (vehicleCompleteness.get(a.id) ?? 0)),
    'Same registration number',
  ).slice(0, 6)

  const duplicateDrivers = [
    ...buildDuplicateGroups(
      driverRows ?? [],
      (row) => normalizeValue(row.email),
      (row) => ({ id: row.id, label: row.full_name, secondaryLabel: row.email }),
      (entries) => [...entries].sort((a, b) => (driverCompleteness.get(b.id) ?? 0) - (driverCompleteness.get(a.id) ?? 0)),
      'Same driver email',
    ),
    ...buildDuplicateGroups(
      driverRows ?? [],
      (row) => normalizeValue(row.full_name),
      (row) => ({ id: row.id, label: row.full_name, secondaryLabel: row.email }),
      (entries) => [...entries].sort((a, b) => (driverCompleteness.get(b.id) ?? 0) - (driverCompleteness.get(a.id) ?? 0)),
      'Same driver name',
    ),
  ].slice(0, 6)

  const cleanupQueue = [
    ...(customerRows ?? [])
      .filter((row) => !normalizeValue(row.email))
      .map((row) => ({
        entityType: 'customer' as const,
        id: row.id,
        label: row.name,
        issue: 'Missing billing email',
        detail: row.business_id || row.billing_city || null,
      })),
    ...(customerRows ?? [])
      .filter((row) => !normalizeValue(row.business_id))
      .map((row) => ({
        entityType: 'customer' as const,
        id: row.id,
        label: row.name,
        issue: 'Missing business ID',
        detail: row.email || row.billing_city || null,
      })),
    ...(vehicleRows ?? [])
      .filter((row) => row.is_active && row.next_service_km === null)
      .map((row) => ({
        entityType: 'vehicle' as const,
        id: row.id,
        label: row.registration_number,
        issue: 'Missing next service target',
        detail: [row.make, row.model].filter(Boolean).join(' ') || null,
      })),
    ...(driverRows ?? [])
      .filter((row) => row.is_active && !normalizeValue(row.email))
      .map((row) => ({
        entityType: 'driver' as const,
        id: row.id,
        label: row.full_name,
        issue: 'Missing driver email',
        detail: row.phone || null,
      })),
    ...(driverRows ?? [])
      .filter((row) => row.is_active && !row.auth_user_id)
      .map((row) => ({
        entityType: 'driver' as const,
        id: row.id,
        label: row.full_name,
        issue: 'Missing auth link',
        detail: row.email || row.phone || null,
      })),
  ].slice(0, 12)

  return {
    counts: {
      customers: customers ?? 0,
      vehicles: vehicles ?? 0,
      drivers: drivers ?? 0,
      orders: orders ?? 0,
      trips: trips ?? 0,
      invoices: invoices ?? 0,
      payments: payments ?? 0,
      documents: documents ?? 0,
    },
    quality: {
      customersMissingEmail: customersMissingEmail ?? 0,
      activeDriversUnlinked: activeDriversUnlinked ?? 0,
      activeDriversMissingEmail: activeDriversMissingEmail ?? 0,
      overdueInvoices: overdueInvoices ?? 0,
      startedTripsWithoutDriver: startedTripsWithoutDriver ?? 0,
      sentInvoicesWithoutPdfUrl: sentInvoicesWithoutPdfUrl ?? 0,
    },
    duplicates: {
      customers: duplicateCustomers,
      vehicles: duplicateVehicles,
      drivers: duplicateDrivers,
    },
    cleanupQueue,
    recency: {
      lastOrderCreatedAt: lastOrderRows?.[0]?.created_at ?? null,
      lastTripCreatedAt: lastTripRows?.[0]?.created_at ?? null,
      lastInvoiceCreatedAt: lastInvoiceRows?.[0]?.created_at ?? null,
      lastPaymentCreatedAt: lastPaymentRows?.[0]?.created_at ?? null,
    },
  }
}
