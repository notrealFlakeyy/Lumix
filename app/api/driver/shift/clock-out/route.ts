import { NextResponse } from 'next/server'

import { requireApiCompany } from '@/lib/auth/require-api-company'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { finishSelfTimeEntry } from '@/lib/db/mutations/workforce'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { finishTimeEntrySchema } from '@/lib/validations/time-entry'

export async function POST(request: Request) {
  const context = await requireApiCompany()
  if (!context) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (context.membership.role !== 'driver' || !context.membership.enabledModules.includes('time')) {
    return NextResponse.json({ error: 'Time tracking is not available for this user.' }, { status: 403 })
  }

  const employeeContext = await getCurrentWorkforceEmployee(context.membership.company_id)
  if (!employeeContext.employee) {
    return NextResponse.json({ error: 'No linked workforce employee found for this login.' }, { status: 400 })
  }

  const summary = await getMobileTimeSummary(
    context.membership.company_id,
    employeeContext.employee.id,
    context.supabase,
    context.membership.branchIds,
  )

  if (!summary.openEntry) {
    return NextResponse.json({ error: 'No open shift found.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const input = finishTimeEntrySchema.parse({
      break_minutes: String(body.break_minutes ?? 0),
      notes: body.notes ?? undefined,
      end_time: undefined,
    })
    const entry = await finishSelfTimeEntry(
      context.membership.company_id,
      context.user.id,
      summary.openEntry.id,
      input,
      context.supabase,
    )
    return NextResponse.json({ ok: true, entry })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to clock out.' }, { status: 400 })
  }
}
