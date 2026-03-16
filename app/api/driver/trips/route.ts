import { NextResponse } from 'next/server'

import { requireDriverApi } from '@/lib/auth/require-driver-api'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'
import { getTripRouteId } from '@/lib/utils/public-ids'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireDriverApi({ previewDriverId })

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  const trips = await getDriverMobileTrips(context.membership.company_id, context.activeDriver.id, context.supabase)

  return NextResponse.json({
    ok: true,
    active_driver: context.activeDriver,
    trips: trips.map((trip) => ({
      ...trip,
      route_id: getTripRouteId(trip),
    })),
  })
}
