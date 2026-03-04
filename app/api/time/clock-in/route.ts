import { NextResponse } from 'next/server'
import { z } from 'zod'

import { requireRouteSession } from '@/lib/auth/require-route-session'

const payloadSchema = z
  .object({
    clientNow: z.string().datetime().optional(),
    timeZone: z.string().optional().nullable(),
  })
  .optional()

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  const serverNow = new Date()
  const clientNow = parsed.success && parsed.data?.clientNow ? new Date(parsed.data.clientNow) : null
  const now =
    clientNow && !Number.isNaN(clientNow.getTime()) && Math.abs(serverNow.getTime() - clientNow.getTime()) <= 10 * 60 * 1000
      ? clientNow.toISOString()
      : serverNow.toISOString()

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
