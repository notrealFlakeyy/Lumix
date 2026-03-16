import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { mobileTimeSummaryResponseSchema } from '@/lib/mobile/contracts'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireMobileDriverApi(request, { previewDriverId, requireTimeModule: true })

  if (!context.ok) {
    return NextResponse.json(mobileTimeSummaryResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  if (!context.workforceEmployee) {
    return NextResponse.json(mobileTimeSummaryResponseSchema.parse({ error: 'No linked workforce employee found for this driver.' }), { status: 404 })
  }

  const summary = await getMobileTimeSummary(
    context.membership.company_id,
    context.workforceEmployee.id,
    context.supabase,
    context.membership.branchIds,
  )

  return NextResponse.json(
    mobileTimeSummaryResponseSchema.parse({
      ok: true,
      summary,
    }),
  )
}
