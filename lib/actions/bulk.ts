'use server'

import type { OrderStatus, InvoiceStatus } from '@/types/app'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireCompany } from '@/lib/auth/require-company'
import { canManageOrders, canManageInvoices, canManageTripExecution } from '@/lib/auth/permissions'
import { bulkUpdateOrderStatus, bulkGenerateInvoicesFromTrips, bulkUpdateInvoiceStatus } from '@/lib/db/mutations/bulk'

export async function bulkUpdateOrderStatusAction(locale: string, orderIds: string[], status: OrderStatus) {
  const { membership } = await requireCompany(locale)
  if (!canManageOrders(membership.role)) throw new Error('Insufficient permissions.')

  const supabase = await createSupabaseServerClient()
  const count = await bulkUpdateOrderStatus(supabase, membership.company_id, orderIds, status)

  revalidatePath(`/${locale}/orders`)
  return { count }
}

export async function bulkUpdateInvoiceStatusAction(locale: string, invoiceIds: string[], status: InvoiceStatus) {
  const { membership } = await requireCompany(locale)
  if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')

  const supabase = await createSupabaseServerClient()
  const count = await bulkUpdateInvoiceStatus(supabase, membership.company_id, invoiceIds, status)

  revalidatePath(`/${locale}/invoices`)
  return { count }
}

export async function bulkGenerateInvoicesFromTripsAction(locale: string, tripIds: string[]) {
  const { membership } = await requireCompany(locale)
  if (!canManageInvoices(membership.role)) throw new Error('Insufficient permissions.')

  const supabase = await createSupabaseServerClient()
  const branchIds = membership.hasRestrictedBranchAccess ? membership.branchIds : null
  const invoiceIds = await bulkGenerateInvoicesFromTrips(supabase, membership.company_id, tripIds, branchIds)

  revalidatePath(`/${locale}/trips`)
  revalidatePath(`/${locale}/invoices`)
  return { invoiceIds }
}
