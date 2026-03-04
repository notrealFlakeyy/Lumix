import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'
import { allModules, computeAllowedModules } from '@/lib/auth/member-access'
import { generateUsername, toUsernameEmail } from '@/lib/auth/username'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const createUserSchema = z.object({
  contactEmail: z.string().trim().email().optional().nullable(),
  password: z.string().min(10).max(200),
  fullName: z.string().trim().min(1).max(200).optional().nullable(),
  role: z.enum(['owner', 'admin', 'accountant', 'sales', 'purchaser', 'employee']).optional().nullable(),
  allowedModules: z.array(z.enum(allModules)).optional().nullable(),
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
  const allowedModules =
    role === 'employee'
      ? ['time']
      : computeAllowedModules(role, parsed.data.allowedModules ?? null)

  let admin
  try {
    admin = createSupabaseAdminClient()
  } catch (error) {
    console.error('Missing admin env', error)
    return NextResponse.json({ ok: false, code: 'serverMisconfigured' }, { status: 500 })
  }

  let created: Awaited<ReturnType<typeof admin.auth.admin.createUser>>['data'] | null = null
  let createError: Awaited<ReturnType<typeof admin.auth.admin.createUser>>['error'] | null = null
  let username = ''

  for (let attempt = 0; attempt < 5; attempt++) {
    username = generateUsername(parsed.data.fullName ?? parsed.data.contactEmail ?? 'user')
    const res = await admin.auth.admin.createUser({
      email: toUsernameEmail(username),
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        username,
        ...(parsed.data.fullName ? { full_name: parsed.data.fullName } : null),
        ...(parsed.data.contactEmail ? { contact_email: parsed.data.contactEmail } : null),
      },
    })

    created = res.data
    createError = res.error

    if (!createError) break
    if (createError.status !== 422) break
  }

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
        allowed_modules: allowedModules,
      },
      { onConflict: 'org_id,user_id' },
    )
    .select('org_id, user_id, role, full_name, allowed_modules')
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
      username,
      contact_email: parsed.data.contactEmail ?? null,
    },
  })
  if (auditUserError) console.error('Failed to insert audit_log (auth.users)', auditUserError)

  const { error: auditMemberError } = await admin.from('audit_log').insert({
    org_id: auth.orgId,
    actor_user_id: auth.user.id,
    action: 'create',
    table_name: 'org_members',
    record_id: userId,
    new_data: { role: membership.role, full_name: membership.full_name, allowed_modules: (membership as any).allowed_modules ?? null },
    metadata: {
      target_user_id: userId,
    },
  })
  if (auditMemberError) console.error('Failed to insert audit_log (org_members)', auditMemberError)

  if (role === 'employee') {
    const fullName = parsed.data.fullName?.trim() || username
    const { error: hrError } = await admin
      .from('hr_employees')
      .upsert(
        {
          org_id: auth.orgId,
          user_id: userId,
          full_name: fullName,
          email: parsed.data.contactEmail ?? null,
        },
        { onConflict: 'org_id,user_id' },
      )
      .select('id')
      .single()

    if (hrError) {
      console.error('Failed to upsert hr_employee', hrError)
    }
  }

  return NextResponse.json({ ok: true, userId, username, membership })
}
