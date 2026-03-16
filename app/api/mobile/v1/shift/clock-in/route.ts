import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { startSelfTimeEntry } from '@/lib/db/mutations/workforce'
import { mobileTimeEntryMutationResponseSchema } from '@/lib/mobile/contracts'

export async function POST(request: Request) {
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

  try {
    const entry = await startSelfTimeEntry(
      context.membership.company_id,
      context.user.id,
      context.workforceEmployee.id,
      'driver',
      context.supabase,
    )
    return NextResponse.json(mobileTimeEntryMutationResponseSchema.parse({ ok: true, entry }))
  } catch (error) {
    return NextResponse.json(
      mobileTimeEntryMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to clock in.' }),
      { status: 400 },
    )
  }
}
