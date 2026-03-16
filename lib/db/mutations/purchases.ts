import 'server-only'

import type { TableRow } from '@/types/database'
import type { PurchaseInvoiceInput } from '@/lib/validations/purchase-invoice'
import type { PurchasePaymentInput } from '@/lib/validations/purchase-payment'
import type { PurchaseVendorInput } from '@/lib/validations/purchase-vendor'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { toNumber } from '@/lib/utils/numbers'

async function getVendorRecord(supabase: DbClient, companyId: string, vendorId: string) {
  const { data, error } = await supabase.from('purchase_vendors').select('*').eq('company_id', companyId).eq('id', vendorId).maybeSingle()
  if (error) throw error
  return data as TableRow<'purchase_vendors'> | null
}

async function getPurchaseInvoiceRecord(supabase: DbClient, companyId: string, invoiceId: string) {
  const { data, error } = await supabase.from('purchase_invoices').select('*').eq('company_id', companyId).eq('id', invoiceId).maybeSingle()
  if (error) throw error
  return data as TableRow<'purchase_invoices'> | null
}

async function getNextPurchaseInvoiceNumber(supabase: DbClient, companyId: string) {
  const { data } = await supabase
    .from('purchase_invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latest = data?.[0]?.invoice_number ?? 'PUR-0000'
  const latestNumeric = Number(latest.split('-').at(-1) ?? 0)
  return `PUR-${String(latestNumeric + 1).padStart(4, '0')}`
}

async function syncPurchaseInvoiceStatus(supabase: DbClient, companyId: string, invoiceId: string) {
  const invoice = await getPurchaseInvoiceRecord(supabase, companyId, invoiceId)
  if (!invoice || invoice.status === 'cancelled') {
    return invoice
  }

  const { data: payments, error } = await supabase
    .from('purchase_payments')
    .select('amount')
    .eq('company_id', companyId)
    .eq('purchase_invoice_id', invoiceId)

  if (error) throw error

  const paidAmount = ((payments ?? []) as Array<Pick<TableRow<'purchase_payments'>, 'amount'>>).reduce((sum, payment) => sum + toNumber(payment.amount), 0)
  let status = invoice.status
  if (paidAmount >= toNumber(invoice.total)) {
    status = 'paid'
  } else if (paidAmount > 0) {
    status = 'partially_paid'
  } else if (invoice.status === 'paid' || invoice.status === 'partially_paid') {
    status = 'approved'
  }

  if (status === invoice.status) {
    return invoice
  }

  const { data: updated, error: updateError } = await supabase
    .from('purchase_invoices')
    .update({ status })
    .eq('company_id', companyId)
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (updateError) throw updateError
  return updated as TableRow<'purchase_invoices'>
}

export async function createPurchaseVendor(companyId: string, userId: string, input: PurchaseVendorInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'vendor')
  }

  const { data, error } = await supabase
    .from('purchase_vendors')
    .insert({
      company_id: companyId,
      ...input,
    })
    .select('*')
    .single()

  if (error) throw error

  const vendor = data as TableRow<'purchase_vendors'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'purchase_vendor',
    entity_id: vendor.id,
    action: 'create',
    new_values: vendor,
  })

  return vendor
}

export async function createPurchaseInvoice(companyId: string, userId: string, input: PurchaseInvoiceInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'purchase invoice')
  }

  const vendor = await getVendorRecord(supabase, companyId, input.vendor_id)
  if (!vendor) {
    throw new Error('Vendor not found.')
  }
  if (vendor.branch_id !== input.branch_id) {
    throw new Error('Vendor and purchase invoice must belong to the same branch.')
  }

  const { data: linkedProducts, error: productError } = await supabase
    .from('inventory_products')
    .select('id, branch_id')
    .eq('company_id', companyId)
    .in(
      'id',
      input.items.map((item) => item.inventory_product_id).filter(Boolean) as string[],
    )

  if (productError) throw productError
  const productBranchMap = new Map((linkedProducts ?? []).map((product) => [product.id, product.branch_id]))
  for (const item of input.items) {
    if (item.inventory_product_id && productBranchMap.get(item.inventory_product_id) !== input.branch_id) {
      throw new Error('Stock-linked line items must point to inventory products in the same branch as the purchase bill.')
    }
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const vatTotal = input.items.reduce((sum, item) => sum + item.quantity * item.unit_price * (item.vat_rate / 100), 0)
  const total = subtotal + vatTotal
  const invoiceNumber = await getNextPurchaseInvoiceNumber(supabase, companyId)

  const { data, error } = await supabase
    .from('purchase_invoices')
    .insert({
      company_id: companyId,
      branch_id: input.branch_id,
      vendor_id: input.vendor_id,
      invoice_number: invoiceNumber,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      status: input.status,
      reference_number: input.reference_number,
      subtotal,
      vat_total: vatTotal,
      total,
      notes: input.notes,
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) throw error

  const invoice = data as TableRow<'purchase_invoices'>
  const items = input.items.map((item) => ({
    purchase_invoice_id: invoice.id,
    inventory_product_id: item.inventory_product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    vat_rate: item.vat_rate,
    line_total: item.quantity * item.unit_price,
  }))

  const { error: itemError } = await supabase.from('purchase_invoice_items').insert(items)
  if (itemError) throw itemError

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'purchase_invoice',
    entity_id: invoice.id,
    action: 'create',
    new_values: {
      ...invoice,
      items,
    },
  })

  return invoice
}

export async function approvePurchaseInvoice(companyId: string, userId: string, invoiceId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const invoice = await getPurchaseInvoiceRecord(supabase, companyId, invoiceId)
  if (!invoice) throw new Error('Purchase invoice not found.')

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, invoice.branch_id, 'purchase invoice')
  }

  if (invoice.status === 'cancelled') {
    throw new Error('Cancelled purchase invoices cannot be approved.')
  }

  const { data, error } = await supabase
    .from('purchase_invoices')
    .update({ status: invoice.status === 'paid' ? 'paid' : invoice.status === 'partially_paid' ? 'partially_paid' : 'approved' })
    .eq('company_id', companyId)
    .eq('id', invoiceId)
    .select('*')
    .single()

  if (error) throw error

  const updated = data as TableRow<'purchase_invoices'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'purchase_invoice',
    entity_id: invoiceId,
    action: 'approve',
    old_values: invoice,
    new_values: updated,
  })

  return updated
}

export async function receivePurchaseInvoice(companyId: string, userId: string, invoiceId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const invoice = await getPurchaseInvoiceRecord(supabase, companyId, invoiceId)
  if (!invoice) throw new Error('Purchase invoice not found.')
  if (invoice.received_at) throw new Error('This purchase invoice has already been received into stock.')
  if (invoice.status === 'cancelled') throw new Error('Cancelled purchase invoices cannot be received.')

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, invoice.branch_id, 'purchase invoice')
  }

  const { data: vendorData, error: vendorError } = await supabase
    .from('purchase_vendors')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', invoice.vendor_id)
    .maybeSingle()
  if (vendorError) throw vendorError
  const vendor = vendorData as TableRow<'purchase_vendors'> | null

  const { data: items, error: itemError } = await supabase
    .from('purchase_invoice_items')
    .select('*')
    .eq('purchase_invoice_id', invoiceId)
  if (itemError) throw itemError

  const typedItems = (items ?? []) as TableRow<'purchase_invoice_items'>[]
  const stockLinkedItems = typedItems.filter((item) => item.inventory_product_id && !item.received_to_stock)
  if (stockLinkedItems.length === 0) {
    throw new Error('There are no pending stock-linked items to receive on this purchase invoice.')
  }

  const { data: products, error: productError } = await supabase
    .from('inventory_products')
    .select('*')
    .eq('company_id', companyId)
    .in('id', stockLinkedItems.map((item) => item.inventory_product_id as string))
  if (productError) throw productError

  const productMap = new Map(((products ?? []) as TableRow<'inventory_products'>[]).map((product) => [product.id, product]))
  const movementRows = stockLinkedItems.map((item) => {
    const product = productMap.get(item.inventory_product_id as string)
    if (!product) {
      throw new Error(`Inventory product for line "${item.description}" no longer exists.`)
    }
    if (product.branch_id !== invoice.branch_id) {
      throw new Error(`Inventory product "${product.name}" belongs to a different branch than this purchase invoice.`)
    }
    return {
      company_id: companyId,
      branch_id: invoice.branch_id,
      product_id: product.id,
      movement_type: 'receipt',
      quantity: item.quantity,
      unit_cost: item.unit_price,
      reference: invoice.invoice_number,
      notes: `${vendor?.name ?? 'Vendor'} receipt`,
      created_by: userId,
      occurred_at: new Date().toISOString(),
    }
  })

  const { error: movementError } = await supabase.from('inventory_movements').insert(movementRows)
  if (movementError) throw movementError

  const { error: receiveItemError } = await supabase
    .from('purchase_invoice_items')
    .update({ received_to_stock: true })
    .eq('purchase_invoice_id', invoiceId)
    .in('id', stockLinkedItems.map((item) => item.id))
  if (receiveItemError) throw receiveItemError

  const { data: updated, error } = await supabase
    .from('purchase_invoices')
    .update({ received_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', invoiceId)
    .select('*')
    .single()
  if (error) throw error

  const updatedInvoice = updated as TableRow<'purchase_invoices'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'purchase_invoice',
    entity_id: invoiceId,
    action: 'receive',
    old_values: invoice,
    new_values: {
      ...updatedInvoice,
      received_line_ids: stockLinkedItems.map((item) => item.id),
    },
  })

  return updatedInvoice
}

export async function registerPurchasePayment(companyId: string, userId: string, invoiceId: string, input: PurchasePaymentInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const invoice = await getPurchaseInvoiceRecord(supabase, companyId, invoiceId)
  if (!invoice) throw new Error('Purchase invoice not found.')
  if (invoice.status === 'cancelled') throw new Error('Cancelled purchase invoices cannot be paid.')

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, invoice.branch_id, 'purchase payment')
  }

  const { data, error } = await supabase
    .from('purchase_payments')
    .insert({
      company_id: companyId,
      purchase_invoice_id: invoiceId,
      payment_date: input.payment_date,
      amount: input.amount,
      reference: input.reference,
      notes: input.notes,
    })
    .select('*')
    .single()
  if (error) throw error

  await syncPurchaseInvoiceStatus(supabase, companyId, invoiceId)

  const payment = data as TableRow<'purchase_payments'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'purchase_payment',
    entity_id: payment.id,
    action: 'create',
    new_values: payment,
  })

  return payment
}
