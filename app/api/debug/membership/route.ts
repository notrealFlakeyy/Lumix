import { NextResponse } from 'next/server'

import { createSupabaseRouteClient } from '@/lib/supabase/route'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const supabase = await createSupabaseRouteClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return NextResponse.json({ ok: false, step: 'getUser', error: userError }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ ok: true, authed: false })
  }

  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const orgId = membership?.org_id ?? null

  const { data: org, error: orgError } = orgId
    ? await supabase.from('organizations').select('id, name').eq('id', orgId).maybeSingle()
    : { data: null, error: null }

  return NextResponse.json({
    ok: true,
    authed: true,
    userId: user.id,
    membership,
    membershipError,
    org,
    orgError,
  })
}

