import { NextResponse } from 'next/server'

import { requireDriverApi } from '@/lib/auth/require-driver-api'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireDriverApi({ previewDriverId, requireTimeModule: true })

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  if (!context.workforceEmployee) {
    return NextResponse.json({ error: 'No linked workforce employee found for this driver.' }, { status: 404 })
  }

  const summary = await getMobileTimeSummary(
    context.membership.company_id,
    context.workforceEmployee.id,
    context.supabase,
    context.membership.branchIds,
  )

  return NextResponse.json({
    ok: true,
    summary,
  })
}
