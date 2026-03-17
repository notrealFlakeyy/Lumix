import 'server-only'

import type { TableRow } from '@/types/database'
import type { QuoteStatus } from '@/types/app'
import type { QuoteInput } from '@/lib/validations/quote'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { createOrder } from '@/lib/db/mutations/orders'
import { computeInvoiceTotals } from '@/lib/utils/invoice'
import { sanitizeHtml } from '@/lib/utils/sanitize'

async function getNextQuoteNumber(companyId: string, client: DbClient) {
  const { data: existingRows } = await client
    .from('sales_quotes')
    .select('quote_number')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latest = existingRows?.[0]?.quote_number ?? null
  const latestNumeric = latest ? Number(latest.split('-').at(-1) ?? 0) : 0
  return `QTE-${String(Math.max(1, latestNumeric + 1)).padStart(4, '0')}`
}

function sanitizeQuoteInput(input: QuoteInput) {
  input.title = sanitizeHtml(input.title)
  input.pickup_location = sanitizeHtml(input.pickup_location)
  input.delivery_location = sanitizeHtml(input.delivery_location)
  if (input.cargo_description) input.cargo_description = sanitizeHtml(input.cargo_description)
  if (input.notes) input.notes = sanitizeHtml(input.notes)

  for (const item of input.items) {
    item.description = sanitizeHtml(item.description)
  }
}

function buildLinePayload(quoteId: string, input: QuoteInput) {
  return input.items.map((item) => ({
    quote_id: quoteId,
    description: item.description,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    vat_rate: Number(item.vat_rate),
    line_total: Number((Number(item.quantity) * Number(item.unit_price)).toFixed(2)),
  }))
}

function buildTotals(input: QuoteInput) {
  return computeInvoiceTotals(
    input.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      vatRate: Number(item.vat_rate),
    })),
  )
}

export async function createQuote(companyId: string, userId: string, input: QuoteInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'quote')
  }

  sanitizeQuoteInput(input)

  const quoteNumber = await getNextQuoteNumber(companyId, supabase)
  const totals = buildTotals(input)

  const { data, error } = await supabase
    .from('sales_quotes')
    .insert({
      company_id: companyId,
      created_by: userId,
      branch_id: input.branch_id ?? null,
      customer_id: input.customer_id,
      quote_number: quoteNumber,
      title: input.title,
      pickup_location: input.pickup_location,
      delivery_location: input.delivery_location,
      cargo_description: input.cargo_description ?? null,
      issue_date: input.issue_date,
      valid_until: input.valid_until ?? null,
      status: input.status,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      total: totals.total,
      notes: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  const quote = data as TableRow<'sales_quotes'>
  const { error: itemsError } = await supabase.from('sales_quote_items').insert(buildLinePayload(quote.id, input))
  if (itemsError) throw itemsError

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'sales_quote',
    entity_id: quote.id,
    action: 'create',
    new_values: quote,
  })

  return quote
}

export async function updateQuote(companyId: string, userId: string, id: string, input: QuoteInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: previous }, { data: previousItems }] = await Promise.all([
    supabase.from('sales_quotes').select('*').eq('company_id', companyId).eq('id', id).maybeSingle(),
    supabase.from('sales_quote_items').select('*').eq('quote_id', id),
  ])

  const previousQuote = previous as TableRow<'sales_quotes'> | null
  if (!previousQuote) {
    throw new Error('Quote not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'quote')
  }

  sanitizeQuoteInput(input)
  const totals = buildTotals(input)

  const { data, error } = await supabase
    .from('sales_quotes')
    .update({
      branch_id: input.branch_id ?? null,
      customer_id: input.customer_id,
      title: input.title,
      pickup_location: input.pickup_location,
      delivery_location: input.delivery_location,
      cargo_description: input.cargo_description ?? null,
      issue_date: input.issue_date,
      valid_until: input.valid_until ?? null,
      status: input.status,
      subtotal: totals.subtotal,
      vat_total: totals.vatTotal,
      total: totals.total,
      notes: input.notes ?? null,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const updatedQuote = data as TableRow<'sales_quotes'>
  const { error: deleteItemsError } = await supabase.from('sales_quote_items').delete().eq('quote_id', id)
  if (deleteItemsError) throw deleteItemsError

  const { error: itemsError } = await supabase.from('sales_quote_items').insert(buildLinePayload(id, input))
  if (itemsError) throw itemsError

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'sales_quote',
    entity_id: id,
    action: 'update',
    old_values: {
      quote: previousQuote,
      items: previousItems ?? [],
    },
    new_values: updatedQuote,
  })

  return updatedQuote
}

export async function updateQuoteStatus(companyId: string, userId: string, id: string, status: QuoteStatus, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('sales_quotes').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const previousQuote = previous as TableRow<'sales_quotes'> | null
  if (!previousQuote) {
    throw new Error('Quote not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, previousQuote.branch_id, 'quote')
  }

  if (previousQuote.converted_order_id && status !== 'accepted') {
    throw new Error('Converted quotes must stay in accepted status.')
  }

  const { data, error } = await supabase
    .from('sales_quotes')
    .update({ status })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const quote = data as TableRow<'sales_quotes'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'sales_quote',
    entity_id: id,
    action: 'status_change',
    old_values: previousQuote,
    new_values: quote,
  })

  return quote
}

export async function convertQuoteToOrder(companyId: string, userId: string, id: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: quoteData } = await supabase.from('sales_quotes').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const quote = quoteData as TableRow<'sales_quotes'> | null

  if (!quote) {
    throw new Error('Quote not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, quote.branch_id, 'quote')
  }

  if (quote.converted_order_id) {
    throw new Error('This quote has already been converted to an order.')
  }

  if (quote.status === 'rejected' || quote.status === 'expired') {
    throw new Error('Rejected or expired quotes cannot be converted to orders.')
  }

  const noteParts = [`Converted from quote ${quote.quote_number}: ${quote.title}`]
  if (quote.notes) {
    noteParts.push(quote.notes)
  }

  const order = await createOrder(
    companyId,
    userId,
    {
      branch_id: quote.branch_id ?? undefined,
      customer_id: quote.customer_id,
      assigned_vehicle_id: undefined,
      assigned_driver_id: undefined,
      pickup_location: quote.pickup_location,
      delivery_location: quote.delivery_location,
      cargo_description: quote.cargo_description ?? undefined,
      scheduled_at: undefined,
      status: 'planned',
      notes: noteParts.join('\n\n'),
    },
    supabase,
  )

  const { data: updatedQuote, error } = await supabase
    .from('sales_quotes')
    .update({
      status: 'accepted',
      converted_order_id: order.id,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'sales_quote',
    entity_id: id,
    action: 'convert_to_order',
    old_values: quote,
    new_values: updatedQuote,
  })

  return order
}
