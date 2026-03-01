import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const createUserSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10).max(200),
  fullName: z.string().trim().min(1).max(200).optional().nullable(),
  role: z.enum(['owner', 'admin', 'accountant', 'sales', 'purchaser', 'employee']).optional().nullable(),
})

export async function POST(req: Request) {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!['owner', 'admin'].includes(auth.role)) {
    return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 })
  }

  const json = await req.json().catch(() => null)
  const parsed = createUserSchema.safeParse(json)
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

  const role = parsed.data.role ?? 'employee'

  let admin
  try {
    admin = createSupabaseAdminClient()
  } catch (error) {
    console.error('Missing admin env', error)
    return NextResponse.json({ ok: false, code: 'serverMisconfigured' }, { status: 500 })
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
  })

  if (createError || !created?.user?.id) {
    console.error('Failed to create user', createError)
    const status = createError?.status === 422 ? 400 : 500
    return NextResponse.json({ ok: false, code: status === 400 ? 'userCreateFailed' : 'unexpected' }, { status })
  }

  const userId = created.user.id

  const { data: membership, error: membershipError } = await admin
    .from('org_members')
    .upsert(
      {
        org_id: auth.orgId,
        user_id: userId,
        role,
        full_name: parsed.data.fullName ?? null,
      },
      { onConflict: 'org_id,user_id' },
    )
    .select('org_id, user_id, role, full_name')
    .single()

  if (membershipError || !membership) {
    console.error('Failed to create membership for new user', membershipError)
    return NextResponse.json({ ok: false, code: 'membershipCreateFailed' }, { status: 500 })
  }

  const { error: auditUserError } = await admin.from('audit_log').insert({
    org_id: auth.orgId,
    actor_user_id: auth.user.id,
    action: 'create',
    table_name: 'auth.users',
    record_id: userId,
    metadata: {
      email: parsed.data.email,
    },
  })
  if (auditUserError) console.error('Failed to insert audit_log (auth.users)', auditUserError)

  const { error: auditMemberError } = await admin.from('audit_log').insert({
    org_id: auth.orgId,
    actor_user_id: auth.user.id,
    action: 'create',
    table_name: 'org_members',
    record_id: userId,
    new_data: { role: membership.role, full_name: membership.full_name },
    metadata: {
      target_user_id: userId,
    },
  })
  if (auditMemberError) console.error('Failed to insert audit_log (org_members)', auditMemberError)

  return NextResponse.json({ ok: true, userId, membership })
}

