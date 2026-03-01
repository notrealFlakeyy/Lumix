import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getCurrentOrg() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, orgId: null, role: null }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  return {
    supabase,
    user,
    orgId: membership?.org_id ?? null,
    role: (membership?.role as string | null) ?? null,
  }
}
