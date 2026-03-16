import type { Membership } from '@/types/app'
import type { TableRow } from '@/types/database'

import { getAccessibleBranchIds } from '@/lib/auth/branch-access'
import { getDbClient, type DbClient } from '@/lib/db/shared'

export async function listBranches(
  companyId: string,
  membership?: Pick<Membership, 'branchIds' | 'hasRestrictedBranchAccess'> | null,
  client?: DbClient,
) {
  const supabase = await getDbClient(client)
  let query = supabase.from('branches').select('*').eq('company_id', companyId).order('name')
  const branchScope = membership ? getAccessibleBranchIds(membership) : null

  if (branchScope?.length) {
    query = query.in('id', branchScope)
  }

  const { data } = await query
  return (data ?? []) as TableRow<'branches'>[]
}

export async function listActiveBranches(
  companyId: string,
  membership?: Pick<Membership, 'branchIds' | 'hasRestrictedBranchAccess'> | null,
  client?: DbClient,
) {
  const branches = await listBranches(companyId, membership, client)
  return branches.filter((branch) => branch.is_active)
}

