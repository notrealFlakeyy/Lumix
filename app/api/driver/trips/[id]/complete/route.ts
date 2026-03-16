import { NextResponse } from 'next/server'

import { requireApiCompany } from '@/lib/auth/require-api-company'
import { getCurrentDriver } from '@/lib/auth/get-current-driver'
import { completeTrip } from '@/lib/db/mutations/trips'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireApiCompany()
  if (!context) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (context.membership.role !== 'driver' || !context.membership.enabledModules.includes('transport')) {
    return NextResponse.json({ error: 'Trip execution is not available for this user.' }, { status: 403 })
  }

  const driver = await getCurrentDriver(context.membership.company_id, context.user.id, context.user.email, context.supabase)
  if (!driver) {
    return NextResponse.json({ error: 'No linked driver profile found for this login.' }, { status: 400 })
  }

  const { id } = await params
  const trip = await getDriverMobileTripById(context.membership.company_id, driver.id, id, context.supabase)
  if (!trip) {
    return NextResponse.json({ error: 'Trip not found for this driver.' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const result = await completeTrip(
      context.membership.company_id,
      context.user.id,
      trip.id,
      {
        end_km: body.end_km ?? undefined,
        waiting_time_minutes: body.waiting_time_minutes ?? undefined,
        delivery_confirmation: body.delivery_confirmation ?? undefined,
        notes: body.notes ?? undefined,
      },
      context.supabase,
    )
    return NextResponse.json({ ok: true, trip: result })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to complete trip.' }, { status: 400 })
  }
}
