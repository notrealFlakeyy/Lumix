import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const assignOrgMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'accountant', 'sales', 'purchaser', 'employee']),
  fullName: z.string().trim().min(1).max(200).optional().nullable(),
})

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin'].includes(auth.role)) {
    return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = assignOrgMemberSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalidPayload',
        issues: process.env.NODE_ENV !== 'production' ? parsed.error.issues : undefined,
      },
      { status: 400 },
    )
  }

  let admin
  try {
    admin = createSupabaseAdminClient()
  } catch (error) {
    console.error('Missing admin env', error)
    return NextResponse.json({ ok: false, code: 'serverMisconfigured' }, { status: 500 })
  }

  const existing = await admin
    .from('org_members')
    .select('role, full_name')
    .eq('org_id', auth.orgId)
    .eq('user_id', parsed.data.userId)
    .maybeSingle()

  const { error: authUserError } = await admin.auth.admin.getUserById(parsed.data.userId)
  if (authUserError) {
    return NextResponse.json({ ok: false, code: 'userNotFound' }, { status: 400 })
  }

  const { data: membership, error: upsertError } = await admin
    .from('org_members')
    .upsert(
      {
        org_id: auth.orgId,
        user_id: parsed.data.userId,
        role: parsed.data.role,
        full_name: parsed.data.fullName ?? null,
      },
      { onConflict: 'org_id,user_id' },
    )
    .select('org_id, user_id, role, full_name')
    .single()

  if (upsertError || !membership) {
    console.error('Failed to upsert org_member', upsertError)
    return NextResponse.json({ ok: false, code: 'assignFailed' }, { status: 500 })
  }

  const action = existing.data ? 'update' : 'create'
  const oldData = existing.data
    ? { role: existing.data.role, full_name: existing.data.full_name }
    : null
  const newData = { role: membership.role, full_name: membership.full_name }

  const { error: auditError } = await admin.from('audit_log').insert({
    org_id: auth.orgId,
    actor_user_id: auth.user.id,
    action,
    table_name: 'org_members',
    record_id: parsed.data.userId,
    old_data: oldData,
    new_data: newData,
    metadata: {
      target_user_id: parsed.data.userId,
    },
  })

  if (auditError) {
    console.error('Failed to insert audit_log', auditError)
  }

  return NextResponse.json({ ok: true, membership })
}
