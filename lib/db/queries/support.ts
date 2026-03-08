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
  recency: {
    lastOrderCreatedAt: string | null
    lastTripCreatedAt: string | null
    lastInvoiceCreatedAt: string | null
    lastPaymentCreatedAt: string | null
  }
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
    supabase.from('transport_orders').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('trips').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('invoices').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
    supabase.from('payments').select('created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(1),
  ])

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
    recency: {
      lastOrderCreatedAt: lastOrderRows?.[0]?.created_at ?? null,
      lastTripCreatedAt: lastTripRows?.[0]?.created_at ?? null,
      lastInvoiceCreatedAt: lastInvoiceRows?.[0]?.created_at ?? null,
      lastPaymentCreatedAt: lastPaymentRows?.[0]?.created_at ?? null,
    },
  }
}
