import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { completeTrip } from '@/lib/db/mutations/trips'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { mobileTripCompleteRequestSchema, mobileTripMutationResponseSchema } from '@/lib/mobile/contracts'
import { validateMobileRequest } from '@/lib/mobile/route-contract'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validated = await validateMobileRequest(request, mobileTripCompleteRequestSchema)
  if (!validated.ok) return validated.response

  const context = await requireMobileDriverApi(request)
  if (!context.ok) {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  if (context.membership.role !== 'driver') {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: 'Trip execution is only available to driver users.' }), { status: 403 })
  }

  const { id } = await params
  const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
  if (!trip) {
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ error: 'Trip not found for this driver.' }), { status: 404 })
  }

  try {
    const result = await completeTrip(
      context.membership.company_id,
      context.user.id,
      trip.id,
      {
        end_km: validated.data.end_km ?? undefined,
        waiting_time_minutes: validated.data.waiting_time_minutes ?? undefined,
        delivery_confirmation: validated.data.delivery_confirmation ?? undefined,
        notes: validated.data.notes ?? undefined,
      },
      context.supabase,
    )
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ ok: true, trip: result }))
  } catch (error) {
    return NextResponse.json(
      mobileTripMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to complete trip.' }),
      { status: 400 },
    )
  }
}
