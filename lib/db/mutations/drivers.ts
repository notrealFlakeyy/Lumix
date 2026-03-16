import 'server-only'

import type { TableRow } from '@/types/database'
import type { DriverInput } from '@/lib/validations/driver'

import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function createDriver(
  companyId: string,
  userId: string,
  input: DriverInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'driver')
  }
  const { data, error } = await supabase.from('drivers').insert({ company_id: companyId, ...input }).select('*').single()
  if (error) throw error

  const driver = data as TableRow<'drivers'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'driver',
    entity_id: driver.id,
    action: 'create',
    new_values: driver,
  })

  return driver
}

export async function updateDriver(
  companyId: string,
  userId: string,
  id: string,
  input: DriverInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('drivers').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'driver')
  }
  const { data, error } = await supabase
    .from('drivers')
    .update(input)
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error

  const driver = data as TableRow<'drivers'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'driver',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: driver,
  })

  return driver
}
