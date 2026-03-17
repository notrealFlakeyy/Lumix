import 'server-only'

import type { TableRow } from '@/types/database'
import type { CustomerInput } from '@/lib/validations/customer'

import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { sanitizeHtml } from '@/lib/utils/sanitize'

export async function createCustomer(
  companyId: string,
  userId: string,
  input: CustomerInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'customer')
  }

  // Sanitize free-text fields
  if (input.name) input.name = sanitizeHtml(input.name)
  if (input.phone) input.phone = sanitizeHtml(input.phone)
  if (input.billing_address_line1) input.billing_address_line1 = sanitizeHtml(input.billing_address_line1)
  if (input.billing_address_line2) input.billing_address_line2 = sanitizeHtml(input.billing_address_line2)
  if (input.billing_postal_code) input.billing_postal_code = sanitizeHtml(input.billing_postal_code)
  if (input.billing_city) input.billing_city = sanitizeHtml(input.billing_city)
  if (input.business_id) input.business_id = sanitizeHtml(input.business_id)
  if (input.vat_number) input.vat_number = sanitizeHtml(input.vat_number)
  if (input.notes) input.notes = sanitizeHtml(input.notes)

  const payload = {
    company_id: companyId,
    ...input,
    billing_country: input.billing_country ?? 'FI',
  }

  const { data, error } = await supabase.from('customers').insert(payload).select('*').single()
  if (error) throw error

  const customer = data as TableRow<'customers'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'customer',
    entity_id: customer.id,
    action: 'create',
    new_values: customer,
  })

  return customer
}

export async function updateCustomer(
  companyId: string,
  userId: string,
  id: string,
  input: CustomerInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('customers').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'customer')
  }

  // Sanitize free-text fields
  if (input.name) input.name = sanitizeHtml(input.name)
  if (input.phone) input.phone = sanitizeHtml(input.phone)
  if (input.billing_address_line1) input.billing_address_line1 = sanitizeHtml(input.billing_address_line1)
  if (input.billing_address_line2) input.billing_address_line2 = sanitizeHtml(input.billing_address_line2)
  if (input.billing_postal_code) input.billing_postal_code = sanitizeHtml(input.billing_postal_code)
  if (input.billing_city) input.billing_city = sanitizeHtml(input.billing_city)
  if (input.business_id) input.business_id = sanitizeHtml(input.business_id)
  if (input.vat_number) input.vat_number = sanitizeHtml(input.vat_number)
  if (input.notes) input.notes = sanitizeHtml(input.notes)

  const { data, error } = await supabase
    .from('customers')
    .update({
      ...input,
      billing_country: input.billing_country ?? 'FI',
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const customer = data as TableRow<'customers'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'customer',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: customer,
  })

  return customer
}
