import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

export async function listTripCheckpoints(
  companyId: string,
  tripId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)
  let query = supabase
    .from('trip_checkpoints')
    .select('*')
    .eq('company_id', companyId)
    .eq('trip_id', tripId)
    .order('captured_at', { ascending: true })

  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return (data ?? []) as TableRow<'trip_checkpoints'>[]
}
