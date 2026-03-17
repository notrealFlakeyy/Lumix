import 'server-only'

import type { TableRow } from '@/types/database'
import type { OrderStatus, InvoiceStatus } from '@/types/app'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { createInvoiceFromTrip } from '@/lib/db/mutations/invoices'

export async function bulkUpdateOrderStatus(
  db: DbClient,
  companyId: string,
  orderIds: string[],
  status: OrderStatus,
) {
  if (orderIds.length === 0) return 0

  const supabase = await getDbClient(db)
  const { membership } = await getCurrentMembership()

  // Fetch all targeted orders to validate company ownership and branch access
  const { data: orders, error: fetchError } = await supabase
    .from('transport_orders')
    .select('*')
    .eq('company_id', companyId)
    .in('id', orderIds)

  if (fetchError) throw fetchError
  const typedOrders = (orders ?? []) as TableRow<'transport_orders'>[]

  if (membership?.company_id === companyId) {
    for (const order of typedOrders) {
      ensureBranchAccess(membership, order.branch_id ?? null, 'order')
    }
  }

  const { data: updated, error } = await supabase
    .from('transport_orders')
    .update({ status })
    .eq('company_id', companyId)
    .in('id', orderIds)
    .select('*')

  if (error) throw error
  const updatedOrders = (updated ?? []) as TableRow<'transport_orders'>[]

  const userId = membership?.user_id ?? ''
  for (let i = 0; i < updatedOrders.length; i++) {
    const previous = typedOrders.find((o) => o.id === updatedOrders[i].id) ?? null
    await insertAuditLog(supabase, {
      company_id: companyId,
      user_id: userId,
      entity_type: 'transport_order',
      entity_id: updatedOrders[i].id,
      action: 'status_change',
      old_values: previous,
      new_values: updatedOrders[i],
    })
  }

  return updatedOrders.length
}

export async function bulkGenerateInvoicesFromTrips(
  db: DbClient,
  companyId: string,
  tripIds: string[],
  branchIds: string[] | null,
) {
  if (tripIds.length === 0) return [] as string[]

  const supabase = await getDbClient(db)
  const { membership } = await getCurrentMembership()
  const userId = membership?.user_id ?? ''

  // Fetch all targeted trips to validate they are completed and not already invoiced
  const { data: trips, error: fetchError } = await supabase
    .from('trips')
    .select('id, status, branch_id')
    .eq('company_id', companyId)
    .in('id', tripIds)

  if (fetchError) throw fetchError
  const typedTrips = (trips ?? []) as Array<{ id: string; status: string; branch_id: string | null }>

  // Filter to only completed trips (not yet invoiced)
  const eligibleTrips = typedTrips.filter((trip) => trip.status === 'completed')

  // Also exclude trips that already have an invoice
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('trip_id')
    .eq('company_id', companyId)
    .in('trip_id', eligibleTrips.map((t) => t.id))

  const alreadyInvoicedTripIds = new Set((existingInvoices ?? []).map((inv) => inv.trip_id))
  const tripsToInvoice = eligibleTrips.filter((trip) => !alreadyInvoicedTripIds.has(trip.id))

  if (membership?.company_id === companyId) {
    for (const trip of tripsToInvoice) {
      ensureBranchAccess(membership, trip.branch_id, 'invoice')
    }
  }

  const createdInvoiceIds: string[] = []

  for (const trip of tripsToInvoice) {
    const invoice = await createInvoiceFromTrip(companyId, userId, trip.id, supabase)
    createdInvoiceIds.push(invoice.id)
  }

  return createdInvoiceIds
}

export async function bulkUpdateInvoiceStatus(
  db: DbClient,
  companyId: string,
  invoiceIds: string[],
  status: InvoiceStatus,
) {
  if (invoiceIds.length === 0) return 0

  const supabase = await getDbClient(db)
  const { membership } = await getCurrentMembership()

  // Fetch all targeted invoices to validate company ownership and branch access
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .in('id', invoiceIds)

  if (fetchError) throw fetchError
  const typedInvoices = (invoices ?? []) as TableRow<'invoices'>[]

  if (membership?.company_id === companyId) {
    for (const invoice of typedInvoices) {
      ensureBranchAccess(membership, invoice.branch_id ?? null, 'invoice')
    }
  }

  const { data: updated, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('company_id', companyId)
    .in('id', invoiceIds)
    .select('*')

  if (error) throw error
  const updatedInvoices = (updated ?? []) as TableRow<'invoices'>[]

  const userId = membership?.user_id ?? ''
  for (let i = 0; i < updatedInvoices.length; i++) {
    const previous = typedInvoices.find((inv) => inv.id === updatedInvoices[i].id) ?? null
    await insertAuditLog(supabase, {
      company_id: companyId,
      user_id: userId,
      entity_type: 'invoice',
      entity_id: updatedInvoices[i].id,
      action: 'status_change',
      old_values: previous,
      new_values: updatedInvoices[i],
    })
  }

  return updatedInvoices.length
}
