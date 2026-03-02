import { NextResponse } from 'next/server'

import { createSupabaseRouteClient } from '@/lib/supabase/route'
import { computeAllowedModules, type AppModule } from '@/lib/auth/member-access'

export async function requireRouteSession() {
  const supabase = await createSupabaseRouteClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false as const, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role, allowed_modules')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership?.org_id) {
    return { ok: false as const, response: NextResponse.json({ message: 'Missing organization' }, { status: 400 }) }
  }

  return {
    ok: true as const,
    supabase,
    user,
    orgId: membership.org_id,
    role: membership.role as string,
    allowedModules: computeAllowedModules(membership.role as string, (membership as any).allowed_modules) as AppModule[],
  }
}
