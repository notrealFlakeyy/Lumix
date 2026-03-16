import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { toNumber } from '@/lib/utils/numbers'

function isInvoiceOpen(status: string) {
  return status !== 'paid' && status !== 'cancelled'
}

function isPastDate(dateValue: string | null | undefined, today: string) {
  return Boolean(dateValue && dateValue < today)
}

export async function getAccountingOverview(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let salesInvoicesQuery = supabase.from('invoices').select('*').eq('company_id', companyId).order('issue_date', { ascending: false })
  let purchaseInvoicesQuery = supabase.from('purchase_invoices').select('*').eq('company_id', companyId).order('invoice_date', { ascending: false })
  if (branchScope) {
    salesInvoicesQuery = salesInvoicesQuery.in('branch_id', branchScope)
    purchaseInvoicesQuery = purchaseInvoicesQuery.in('branch_id', branchScope)
  }

  const [
    { data: salesInvoices },
    { data: salesPayments },
    { data: purchaseInvoices },
    { data: purchasePayments },
    { data: customers },
    { data: vendors },
    { data: branches },
  ] = await Promise.all([
    salesInvoicesQuery,
    supabase.from('payments').select('invoice_id, amount, payment_date').eq('company_id', companyId),
    purchaseInvoicesQuery,
    supabase.from('purchase_payments').select('purchase_invoice_id, amount, payment_date').eq('company_id', companyId),
    supabase.from('customers').select('id, name').eq('company_id', companyId),
    supabase.from('purchase_vendors').select('id, name').eq('company_id', companyId),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = byId((customers ?? []) as Array<Pick<TableRow<'customers'>, 'id' | 'name'>>)
  const vendorMap = byId((vendors ?? []) as Array<Pick<TableRow<'purchase_vendors'>, 'id' | 'name'>>)
  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const visibleSalesInvoiceIds = new Set(((salesInvoices ?? []) as TableRow<'invoices'>[]).map((invoice) => invoice.id))
  const visiblePurchaseInvoiceIds = new Set(((purchaseInvoices ?? []) as TableRow<'purchase_invoices'>[]).map((invoice) => invoice.id))

  const salesPaymentsByInvoice = new Map<string, number>()
  let cashCollected30d = 0
  for (const payment of (salesPayments ?? []) as Array<Pick<TableRow<'payments'>, 'invoice_id' | 'amount' | 'payment_date'>>) {
    if (!visibleSalesInvoiceIds.has(payment.invoice_id)) {
      continue
    }
    const amount = toNumber(payment.amount)
    salesPaymentsByInvoice.set(payment.invoice_id, (salesPaymentsByInvoice.get(payment.invoice_id) ?? 0) + amount)
    if (payment.payment_date >= thirtyDaysAgo.slice(0, 10)) {
      cashCollected30d += amount
    }
  }

  const purchasePaymentsByInvoice = new Map<string, number>()
  let cashPaid30d = 0
  for (const payment of (purchasePayments ?? []) as Array<Pick<TableRow<'purchase_payments'>, 'purchase_invoice_id' | 'amount' | 'payment_date'>>) {
    if (!visiblePurchaseInvoiceIds.has(payment.purchase_invoice_id)) {
      continue
    }
    const amount = toNumber(payment.amount)
    purchasePaymentsByInvoice.set(payment.purchase_invoice_id, (purchasePaymentsByInvoice.get(payment.purchase_invoice_id) ?? 0) + amount)
    if (payment.payment_date >= thirtyDaysAgo.slice(0, 10)) {
      cashPaid30d += amount
    }
  }

  const receivables = ((salesInvoices ?? []) as TableRow<'invoices'>[]).map((invoice) => {
    const paidAmount = salesPaymentsByInvoice.get(invoice.id) ?? 0
    const balanceDue = Math.max(toNumber(invoice.total) - paidAmount, 0)
    return {
      ...invoice,
      customer_name: customerMap.get(invoice.customer_id)?.name ?? 'Unknown customer',
      branch_name: invoice.branch_id ? branchMap.get(invoice.branch_id)?.name ?? 'Unknown branch' : 'Unassigned',
      paid_amount: paidAmount,
      balance_due: balanceDue,
    }
  })

  const payables = ((purchaseInvoices ?? []) as TableRow<'purchase_invoices'>[]).map((invoice) => {
    const paidAmount = purchasePaymentsByInvoice.get(invoice.id) ?? 0
    const balanceDue = Math.max(toNumber(invoice.total) - paidAmount, 0)
    return {
      ...invoice,
      vendor_name: vendorMap.get(invoice.vendor_id)?.name ?? 'Unknown vendor',
      branch_name: branchMap.get(invoice.branch_id)?.name ?? 'Unknown branch',
      paid_amount: paidAmount,
      balance_due: balanceDue,
    }
  })

  const openReceivables = receivables.filter((invoice) => isInvoiceOpen(invoice.status))
  const openPayables = payables.filter((invoice) => isInvoiceOpen(invoice.status))

  return {
    metrics: {
      receivablesOutstanding: openReceivables.reduce((sum, invoice) => sum + invoice.balance_due, 0),
      receivablesOverdueCount: openReceivables.filter((invoice) => isPastDate(invoice.due_date, today)).length,
      payablesOutstanding: openPayables.reduce((sum, invoice) => sum + invoice.balance_due, 0),
      payablesOverdueCount: openPayables.filter((invoice) => isPastDate(invoice.due_date, today)).length,
      netOutstanding: openReceivables.reduce((sum, invoice) => sum + invoice.balance_due, 0) - openPayables.reduce((sum, invoice) => sum + invoice.balance_due, 0),
      cashCollected30d,
      cashPaid30d,
    },
    receivables: openReceivables.slice(0, 8),
    payables: openPayables.slice(0, 8),
  }
}
