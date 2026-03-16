import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { finishSelfTimeEntry } from '@/lib/db/mutations/workforce'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { mobileShiftClockOutRequestSchema, mobileTimeEntryMutationResponseSchema } from '@/lib/mobile/contracts'
import { validateMobileRequest } from '@/lib/mobile/route-contract'
import { finishTimeEntrySchema } from '@/lib/validations/time-entry'

export async function POST(request: Request) {
  const validated = await validateMobileRequest(request, mobileShiftClockOutRequestSchema)
  if (!validated.ok) return validated.response

  const context = await requireMobileDriverApi(request, { requireTimeModule: true })
  if (!context.ok) {
    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  if (context.membership.role !== 'driver') {
    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ error: 'Time tracking is only available to driver users.' }), { status: 403 })
  }

  if (!context.workforceEmployee) {
    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ error: 'No linked workforce employee found for this login.' }), { status: 400 })
  }

  const summary = await getMobileTimeSummary(
    context.membership.company_id,
    context.workforceEmployee.id,
    context.supabase,
    context.membership.branchIds,
  )

  if (!summary.openEntry) {
    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ error: 'No open shift found.' }), { status: 400 })
  }

  try {
    const input = finishTimeEntrySchema.parse({
      break_minutes: String(validated.data.break_minutes ?? 0),
      notes: validated.data.notes ?? undefined,
      end_time: undefined,
    })

    const entry = await finishSelfTimeEntry(
      context.membership.company_id,
      context.user.id,
      summary.openEntry.id,
      input,
      context.supabase,
    )

    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ ok: true, entry }))
  } catch (error) {
    return NextResponse.json(
      mobileTimeEntryMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to clock out.' }),
      { status: 400 },
    )
  }
}
