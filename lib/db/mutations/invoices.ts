import 'server-only'

import type { TableRow } from '@/types/database'
import type { InvoiceStatus } from '@/types/app'
import type { InvoiceInput } from '@/lib/validations/invoice'

import { computeInvoiceTotals, createTripInvoiceItems, deriveInvoiceStatus, buildInvoicePdfFileName, buildInvoicePdfPath } from '@/lib/utils/invoice'
import { getDbClient, getNextDocumentNumber, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { getCompanyAppSettings } from '@/lib/db/queries/company-settings'
import { getInvoiceById } from '@/lib/db/queries/invoices'
import { buildInvoicePdf } from '@/lib/invoices/pdf'
import { sendInvoiceEmail } from '@/lib/invoices/email'
import { getServiceRoleEnv } from '@/lib/env/service-role'
import { toNumber } from '@/lib/utils/numbers'

export async function createInvoice(companyId: string, userId: string, input: InvoiceInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const invoiceNumber = await getNextDocumentNumber(supabase, 'invoices', companyId, 'INV')
  const normalizedItems = input.items.map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    vatRate: Number(item.vat_rate),
  }))
  const totals = computeInvoiceTotals(normalizedItems)

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      created_by: userId,
      customer_id: input.customer_id,
      trip_id: input.trip_id ?? null,
      invoice_number: invoiceNumber,
      issue_date: input.issue_date,
      due_date: input.due_date,
      reference_number: input.reference_number ?? null,
      status: input.status,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      total: totals.total,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  const createdInvoice = invoice as TableRow<'invoices'>

  const linePayload = normalizedItems.map((item) => ({
    invoice_id: createdInvoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    vat_rate: item.vatRate,
    line_total: Number((item.quantity * item.unitPrice).toFixed(2)),
  }))

  const { error: linesError } = await supabase.from('invoice_items').insert(linePayload)
  if (linesError) throw linesError

  if (createdInvoice.trip_id) {
    await supabase.from('trips').update({ status: 'invoiced' }).eq('company_id', companyId).eq('id', createdInvoice.trip_id)
    const { data: trip } = await supabase
      .from('trips')
      .select('transport_order_id')
      .eq('company_id', companyId)
      .eq('id', createdInvoice.trip_id)
      .maybeSingle()

    if (trip?.transport_order_id) {
      await supabase
        .from('transport_orders')
        .update({ status: 'invoiced' })
        .eq('company_id', companyId)
        .eq('id', trip.transport_order_id)
    }
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'invoice',
    entity_id: createdInvoice.id,
    action: 'create',
    new_values: createdInvoice,
  })

  return createdInvoice
}

export async function createInvoiceFromTrip(companyId: string, userId: string, tripId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: trip, error } = await supabase.from('trips').select('*').eq('company_id', companyId).eq('id', tripId).single()
  if (error) throw error
  const tripRow = trip as TableRow<'trips'>
  const companySettings = await getCompanyAppSettings(companyId, supabase)
  const paymentTermsDays = companySettings?.default_payment_terms_days ?? 14
  const defaultVatRate = Number(companySettings?.default_vat_rate ?? 25.5)

  const issueDate = new Date().toISOString().slice(0, 10)
  const dueDate = new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const itemBlueprints = createTripInvoiceItems(toNumber(tripRow.distance_km), tripRow.waiting_time_minutes, defaultVatRate)

  return createInvoice(
    companyId,
    userId,
    {
      customer_id: tripRow.customer_id,
      trip_id: tripRow.id,
      issue_date: issueDate,
      due_date: dueDate,
      reference_number: undefined,
      status: 'draft',
      notes: `Generated from trip ${tripRow.id.slice(0, 8).toUpperCase()}`,
      items: itemBlueprints.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        vat_rate: item.vatRate,
        line_total: item.quantity * item.unitPrice,
      })),
    },
    supabase,
  )
}

export async function updateInvoiceStatus(companyId: string, userId: string, id: string, status: InvoiceStatus, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('invoices').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const typedInvoice = data as TableRow<'invoices'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'invoice',
    entity_id: id,
    action: 'status_change',
    old_values: previous,
    new_values: typedInvoice,
  })

  return typedInvoice
}

export async function refreshInvoicePaymentStatus(companyId: string, userId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: invoice }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId).eq('id', id).single(),
    supabase.from('payments').select('amount').eq('company_id', companyId).eq('invoice_id', id),
  ])

  const invoiceRow = invoice as TableRow<'invoices'>
  const paidAmount = (payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const status = deriveInvoiceStatus(invoiceRow.status as InvoiceStatus, toNumber(invoiceRow.total), paidAmount, invoiceRow.due_date)

  return updateInvoiceStatus(companyId, userId, id, status, supabase)
}

export async function sendInvoiceToCustomer(companyId: string, userId: string, invoiceId: string, locale: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const bundle = await getInvoiceById(companyId, invoiceId, supabase)
  if (!bundle) {
    throw new Error('Invoice not found.')
  }

  if (!bundle.customer?.email) {
    throw new Error('The selected customer does not have a billing email address.')
  }

  const pdfBuffer = await buildInvoicePdf(bundle)
  const pdfFileName = buildInvoicePdfFileName(bundle.invoice.invoice_number)
  await sendInvoiceEmail(bundle, pdfBuffer, pdfFileName)

  const siteUrl = (getServiceRoleEnv().NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const pdfPath = buildInvoicePdfPath(locale, bundle.invoice.id)
  const [{ data: previousInvoice }, { data: payments }] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId).eq('id', invoiceId).maybeSingle(),
    supabase.from('payments').select('amount').eq('company_id', companyId).eq('invoice_id', invoiceId),
  ])

  const paidAmount = (payments ?? []).reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  const nextStatus = deriveInvoiceStatus('sent', toNumber(bundle.invoice.total), paidAmount, bundle.invoice.due_date)
  const { data: updatedInvoice, error } = await supabase
    .from('invoices')
    .update({
      status: nextStatus,
      pdf_url: `${siteUrl}${pdfPath}`,
    })
    .eq('company_id', companyId)
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (error || !updatedInvoice) {
    throw error ?? new Error('Unable to update invoice after email delivery.')
  }

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'invoice',
    entity_id: invoiceId,
    action: 'send_email',
    old_values: previousInvoice,
    new_values: updatedInvoice,
  })

  return updatedInvoice as TableRow<'invoices'>
}
