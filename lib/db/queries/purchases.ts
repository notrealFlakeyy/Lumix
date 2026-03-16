import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { toNumber } from '@/lib/utils/numbers'

export async function listPurchaseVendors(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let vendorQuery = supabase.from('purchase_vendors').select('*').eq('company_id', companyId).order('name')
  if (branchScope) {
    vendorQuery = vendorQuery.in('branch_id', branchScope)
  }

  const [{ data: vendors }, { data: branches }, { data: invoices }] = await Promise.all([
    vendorQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('purchase_invoices').select('id, vendor_id').eq('company_id', companyId),
  ])

  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const invoiceCountByVendor = new Map<string, number>()
  for (const invoice of (invoices ?? []) as Array<Pick<TableRow<'purchase_invoices'>, 'vendor_id'>>) {
    invoiceCountByVendor.set(invoice.vendor_id, (invoiceCountByVendor.get(invoice.vendor_id) ?? 0) + 1)
  }

  return ((vendors ?? []) as TableRow<'purchase_vendors'>[]).map((vendor) => ({
    ...vendor,
    branch_name: branchMap.get(vendor.branch_id)?.name ?? 'Unknown branch',
    invoice_count: invoiceCountByVendor.get(vendor.id) ?? 0,
  }))
}

export async function listPurchaseInvoices(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let invoiceQuery = supabase.from('purchase_invoices').select('*').eq('company_id', companyId).order('invoice_date', { ascending: false })
  if (branchScope) {
    invoiceQuery = invoiceQuery.in('branch_id', branchScope)
  }

  const [{ data: invoices }, { data: vendors }, { data: branches }, { data: payments }, { data: items }] = await Promise.all([
    invoiceQuery,
    supabase.from('purchase_vendors').select('id, name').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
    supabase.from('purchase_payments').select('purchase_invoice_id, amount').eq('company_id', companyId),
    supabase.from('purchase_invoice_items').select('purchase_invoice_id, received_to_stock, inventory_product_id'),
  ])

  const vendorMap = byId((vendors ?? []) as Array<Pick<TableRow<'purchase_vendors'>, 'id' | 'name'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const paidAmountByInvoice = new Map<string, number>()
  for (const payment of (payments ?? []) as Array<Pick<TableRow<'purchase_payments'>, 'purchase_invoice_id' | 'amount'>>) {
    paidAmountByInvoice.set(payment.purchase_invoice_id, (paidAmountByInvoice.get(payment.purchase_invoice_id) ?? 0) + toNumber(payment.amount))
  }
  const receiptStateByInvoice = new Map<string, { linked: number; received: number }>()
  for (const item of (items ?? []) as Array<Pick<TableRow<'purchase_invoice_items'>, 'purchase_invoice_id' | 'inventory_product_id' | 'received_to_stock'>>) {
    if (!item.inventory_product_id) {
      continue
    }
    const current = receiptStateByInvoice.get(item.purchase_invoice_id) ?? { linked: 0, received: 0 }
    current.linked += 1
    if (item.received_to_stock) {
      current.received += 1
    }
    receiptStateByInvoice.set(item.purchase_invoice_id, current)
  }

  return ((invoices ?? []) as TableRow<'purchase_invoices'>[]).map((invoice) => {
    const paymentTotal = paidAmountByInvoice.get(invoice.id) ?? 0
    const receiptState = receiptStateByInvoice.get(invoice.id) ?? { linked: 0, received: 0 }
    const pendingReceipts = receiptState.linked > receiptState.received
    return {
      ...invoice,
      vendor_name: vendorMap.get(invoice.vendor_id)?.name ?? 'Unknown vendor',
      branch_name: branchMap.get(invoice.branch_id)?.name ?? 'Unknown branch',
      paid_amount: paymentTotal,
      balance_due: Math.max(toNumber(invoice.total) - paymentTotal, 0),
      has_pending_receipts: pendingReceipts,
      receipt_progress_label:
        receiptState.linked === 0 ? 'No stock-linked items' : `${receiptState.received}/${receiptState.linked} received`,
    }
  })
}

export async function getPurchaseInvoiceById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let invoiceQuery = supabase.from('purchase_invoices').select('*').eq('company_id', companyId).eq('id', id)
  if (branchScope) {
    invoiceQuery = invoiceQuery.in('branch_id', branchScope)
  }

  const [{ data: invoice }, { data: vendors }, { data: branches }, { data: payments }, { data: items }, { data: products }] = await Promise.all([
    invoiceQuery.maybeSingle(),
    supabase.from('purchase_vendors').select('*').eq('company_id', companyId),
    supabase.from('branches').select('id, name, code').eq('company_id', companyId),
    supabase.from('purchase_payments').select('*').eq('company_id', companyId).eq('purchase_invoice_id', id).order('payment_date', { ascending: false }),
    supabase.from('purchase_invoice_items').select('*').eq('purchase_invoice_id', id),
    supabase.from('inventory_products').select('id, branch_id, sku, name, unit').eq('company_id', companyId),
  ])

  const typedInvoice = invoice as TableRow<'purchase_invoices'> | null
  if (!typedInvoice) {
    return null
  }

  const vendorMap = byId((vendors ?? []) as TableRow<'purchase_vendors'>[])
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name' | 'code'>>)
  const productMap = byId((products ?? []) as Array<Pick<TableRow<'inventory_products'>, 'id' | 'branch_id' | 'sku' | 'name' | 'unit'>>)
  const typedItems = (items ?? []) as TableRow<'purchase_invoice_items'>[]
  const typedPayments = (payments ?? []) as TableRow<'purchase_payments'>[]
  const paidAmount = typedPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)

  return {
    invoice: typedInvoice,
    vendor: vendorMap.get(typedInvoice.vendor_id) ?? null,
    branch: branchMap.get(typedInvoice.branch_id) ?? null,
    items: typedItems.map((item) => ({
      ...item,
      product: item.inventory_product_id ? productMap.get(item.inventory_product_id) ?? null : null,
    })),
    payments: typedPayments,
    metrics: {
      paid_amount: paidAmount,
      balance_due: Math.max(toNumber(typedInvoice.total) - paidAmount, 0),
      pending_receipts: typedItems.filter((item) => item.inventory_product_id && !item.received_to_stock).length,
    },
  }
}

export async function getPurchasesOverview(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const invoices = await listPurchaseInvoices(companyId, client, branchIds)
  const vendors = await listPurchaseVendors(companyId, client, branchIds)
  const today = new Date().toISOString().slice(0, 10)

  return {
    vendorCount: vendors.length,
    openInvoiceCount: invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled').length,
    overdueInvoiceCount: invoices.filter((invoice) => invoice.status !== 'paid' && invoice.status !== 'cancelled' && !!invoice.due_date && invoice.due_date < today).length,
    outstandingAmount: invoices.reduce((sum, invoice) => sum + invoice.balance_due, 0),
    pendingReceiptCount: invoices.filter((invoice) => invoice.has_pending_receipts).length,
    recentInvoices: invoices.slice(0, 6),
  }
}
