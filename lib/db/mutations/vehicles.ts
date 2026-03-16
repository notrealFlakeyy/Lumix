import 'server-only'

import type { TableRow } from '@/types/database'
import type { VehicleInput } from '@/lib/validations/vehicle'

import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function createVehicle(
  companyId: string,
  userId: string,
  input: VehicleInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'vehicle')
  }
  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      company_id: companyId,
      ...input,
      current_km: input.current_km ?? 0,
      next_service_km: input.next_service_km ?? null,
    })
    .select('*')
    .single()

  if (error) throw error

  const vehicle = data as TableRow<'vehicles'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'vehicle',
    entity_id: vehicle.id,
    action: 'create',
    new_values: vehicle,
  })

  return vehicle
}

export async function updateVehicle(
  companyId: string,
  userId: string,
  id: string,
  input: VehicleInput,
  membership?: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('vehicles').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  if (membership) {
    ensureBranchAccess(membership, input.branch_id, 'vehicle')
  }
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      ...input,
      current_km: input.current_km ?? 0,
      next_service_km: input.next_service_km ?? null,
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const vehicle = data as TableRow<'vehicles'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'vehicle',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: vehicle,
  })

  return vehicle
}
