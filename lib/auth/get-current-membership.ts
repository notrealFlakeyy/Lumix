import type { Membership } from '@/types/app'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getCurrentMembership() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, membership: null as Membership | null }
  }

  const { data: membershipRow } = await supabase
    .from('company_users')
    .select('id, company_id, user_id, role, is_active, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!membershipRow) {
    return { supabase, user, membership: null as Membership | null }
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, timezone, country')
    .eq('id', membershipRow.company_id)
    .maybeSingle()

  const membership: Membership | null = company
    ? {
        ...membershipRow,
        company,
      }
    : null

  return { supabase, user, membership }
}
