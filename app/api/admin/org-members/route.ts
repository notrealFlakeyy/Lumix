import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { allModules, computeAllowedModules } from '@/lib/auth/member-access'
import { toUsernameEmail } from '@/lib/auth/username'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const assignOrgMemberSchema = z.object({
  user: z.string().trim().min(1),
  role: z.enum(['owner', 'admin', 'accountant', 'sales', 'purchaser', 'employee']),
  fullName: z.string().trim().min(1).max(200).optional().nullable(),
  allowedModules: z.array(z.enum(allModules)).optional().nullable(),
})

async function resolveUserId(admin: ReturnType<typeof createSupabaseAdminClient>, user: string) {
  const trimmed = user.trim()
  const uuid = z.string().uuid().safeParse(trimmed)
  if (uuid.success) return uuid.data

  const email = toUsernameEmail(trimmed)
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break
    const found = data?.users?.find((u) => (u as any).email === email)
    if (found?.id) return found.id
    if (!data?.users?.length) break
  }

  return null
}

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

  const userId = await resolveUserId(admin, parsed.data.user)
  if (!userId) {
    return NextResponse.json({ ok: false, code: 'userNotFound' }, { status: 400 })
  }

  const existing = await admin
    .from('org_members')
    .select('role, full_name, allowed_modules')
    .eq('org_id', auth.orgId)
    .eq('user_id', userId)
    .maybeSingle()

  const { data: targetUser, error: authUserError } = await admin.auth.admin.getUserById(userId)
  if (authUserError || !targetUser?.user) {
    return NextResponse.json({ ok: false, code: 'userNotFound' }, { status: 400 })
  }

  const allowedModules =
    parsed.data.role === 'employee'
      ? ['time']
      : computeAllowedModules(parsed.data.role, parsed.data.allowedModules ?? existing.data?.allowed_modules ?? null)

  const { data: membership, error: upsertError } = await admin
    .from('org_members')
    .upsert(
      {
        org_id: auth.orgId,
        user_id: userId,
        role: parsed.data.role,
        full_name: parsed.data.fullName ?? null,
        allowed_modules: allowedModules,
      },
      { onConflict: 'org_id,user_id' },
    )
    .select('org_id, user_id, role, full_name, allowed_modules')
    .single()

  if (upsertError || !membership) {
    console.error('Failed to upsert org_member', upsertError)
    return NextResponse.json({ ok: false, code: 'assignFailed' }, { status: 500 })
  }

  const action = existing.data ? 'update' : 'create'
  const oldData = existing.data
    ? { role: existing.data.role, full_name: existing.data.full_name, allowed_modules: existing.data.allowed_modules ?? null }
    : null
  const newData = {
    role: membership.role,
    full_name: membership.full_name,
    allowed_modules: (membership as any).allowed_modules ?? null,
  }

  const { error: auditError } = await admin.from('audit_log').insert({
    org_id: auth.orgId,
    actor_user_id: auth.user.id,
    action,
    table_name: 'org_members',
    record_id: userId,
    old_data: oldData,
    new_data: newData,
    metadata: {
      target_user_id: userId,
    },
  })

  if (auditError) {
    console.error('Failed to insert audit_log', auditError)
  }

  if (parsed.data.role === 'employee') {
    const fullName = (parsed.data.fullName ?? (targetUser.user.user_metadata as any)?.full_name ?? targetUser.user.email ?? '').trim()
    if (fullName) {
      const { error: hrError } = await admin
        .from('hr_employees')
        .upsert(
          {
            org_id: auth.orgId,
            user_id: userId,
            full_name: fullName,
            email: targetUser.user.email ?? null,
          },
          { onConflict: 'org_id,user_id' },
        )
        .select('id')
        .single()

      if (hrError) {
        console.error('Failed to upsert hr_employee', hrError)
      }
    }
  }

  return NextResponse.json({ ok: true, membership })
}
