import { NextResponse } from 'next/server'

import { requireRouteSession } from '@/lib/auth/require-route-session'

export async function POST() {
  const auth = await requireRouteSession()
  if (!auth.ok) return auth.response

  if (!auth.allowedModules.includes('time')) {
    return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 })
  }

  const { data: employee, error: employeeError } = await auth.supabase
    .from('hr_employees')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (employeeError || !employee?.id) {
    return NextResponse.json({ ok: false, code: 'employeeNotFound' }, { status: 400 })
  }

  const { data: openEntry } = await auth.supabase
    .from('pay_time_entries')
    .select('id')
    .eq('org_id', auth.orgId)
    .eq('employee_id', employee.id)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openEntry?.id) {
    return NextResponse.json({ ok: true, alreadyRunning: true, entryId: openEntry.id })
  }

  const now = new Date().toISOString()

  const { data: created, error } = await auth.supabase
    .from('pay_time_entries')
    .insert({
      org_id: auth.orgId,
      employee_id: employee.id,
      start_time: now,
      end_time: null,
      minutes: 0,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !created?.id) {
    console.error('Clock-in failed', error)
    return NextResponse.json({ ok: false, code: 'clockInFailed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, entryId: created.id })
}

