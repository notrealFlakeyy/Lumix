import 'server-only'

import type { TableRow } from '@/types/database'
import type { CustomerInput } from '@/lib/validations/customer'

import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

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
