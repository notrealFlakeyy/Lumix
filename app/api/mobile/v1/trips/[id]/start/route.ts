import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { startTrip } from '@/lib/db/mutations/trips'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { mobileTripMutationResponseSchema, mobileTripStartRequestSchema } from '@/lib/mobile/contracts'
import { validateMobileRequest } from '@/lib/mobile/route-contract'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validated = await validateMobileRequest(request, mobileTripStartRequestSchema)
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
    const result = await startTrip(
      context.membership.company_id,
      context.user.id,
      trip.id,
      {
        start_km: validated.data.start_km ?? undefined,
        notes: validated.data.notes ?? undefined,
      },
      context.supabase,
    )
    return NextResponse.json(mobileTripMutationResponseSchema.parse({ ok: true, trip: result }))
  } catch (error) {
    return NextResponse.json(
      mobileTripMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to start trip.' }),
      { status: 400 },
    )
  }
}
