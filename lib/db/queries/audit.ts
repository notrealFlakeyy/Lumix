import type { TableRow } from '@/types/database'

import { getDbClient, type DbClient } from '@/lib/db/shared'

export type RecentAuditLog = TableRow<'audit_logs'> & {
  actor_name: string | null
}

export async function listRecentAuditLogs(companyId: string, limit = 12, client?: DbClient) {
  const supabase = await getDbClient(client)
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase.from('audit_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, full_name'),
  ])

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? null]))

  return ((logs ?? []) as TableRow<'audit_logs'>[]).map((log) => ({
    ...log,
    actor_name: log.user_id ? profileMap.get(log.user_id) ?? null : null,
  })) satisfies RecentAuditLog[]
}
