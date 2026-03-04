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

  const { data: openEntry, error: openError } = await auth.supabase
    .from('pay_time_entries')
    .select('id, start_time')
    .eq('org_id', auth.orgId)
    .eq('employee_id', employee.id)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (openError) {
    console.error('Clock-out lookup failed', openError)
    return NextResponse.json({ ok: false, code: 'clockOutFailed' }, { status: 500 })
  }

  if (!openEntry?.id || !openEntry.start_time) {
    return NextResponse.json({ ok: false, code: 'noActiveEntry' }, { status: 400 })
  }

  const start = new Date(openEntry.start_time)
  const json = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(json)
  const serverNow = new Date()
  const clientNow = parsed.success && parsed.data?.clientNow ? new Date(parsed.data.clientNow) : null
  const end =
    clientNow && !Number.isNaN(clientNow.getTime()) && Math.abs(serverNow.getTime() - clientNow.getTime()) <= 10 * 60 * 1000
      ? clientNow
      : serverNow
  const minutes = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 60000))

  const { error: updateError } = await auth.supabase
    .from('pay_time_entries')
    .update({
      end_time: end.toISOString(),
      minutes,
    })
    .eq('id', openEntry.id)
    .eq('org_id', auth.orgId)

  if (updateError) {
    console.error('Clock-out update failed', updateError)
    return NextResponse.json({ ok: false, code: 'clockOutFailed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, entryId: openEntry.id, minutes })
}
