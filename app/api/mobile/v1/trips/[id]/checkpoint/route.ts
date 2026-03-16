import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { captureTripCheckpoint } from '@/lib/db/mutations/trip-checkpoints'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { mobileCheckpointMutationResponseSchema, mobileTripCheckpointRequestSchema } from '@/lib/mobile/contracts'
import { validateMobileRequest } from '@/lib/mobile/route-contract'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validated = await validateMobileRequest(request, mobileTripCheckpointRequestSchema)
  if (!validated.ok) return validated.response

  const context = await requireMobileDriverApi(request)
  if (!context.ok) {
    return NextResponse.json(mobileCheckpointMutationResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  if (context.membership.role !== 'driver') {
    return NextResponse.json(mobileCheckpointMutationResponseSchema.parse({ error: 'Trip checkpoints are only available to driver users.' }), { status: 403 })
  }

  const { id } = await params
  const trip = await getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase)
  if (!trip) {
    return NextResponse.json(mobileCheckpointMutationResponseSchema.parse({ error: 'Trip not found for this driver.' }), { status: 404 })
  }

  try {
    const checkpoint = await captureTripCheckpoint(
      context.membership.company_id,
      context.user.id,
      trip.id,
      {
        checkpoint_type: validated.data.checkpoint_type,
        latitude: validated.data.latitude,
        longitude: validated.data.longitude,
        accuracy_meters: validated.data.accuracy_meters != null ? Number(validated.data.accuracy_meters) : null,
        notes: validated.data.notes ?? null,
      },
      context.supabase,
    )
    return NextResponse.json(mobileCheckpointMutationResponseSchema.parse({ ok: true, checkpoint }))
  } catch (error) {
    return NextResponse.json(
      mobileCheckpointMutationResponseSchema.parse({ error: error instanceof Error ? error.message : 'Unable to capture checkpoint.' }),
      { status: 400 },
    )
  }
}
