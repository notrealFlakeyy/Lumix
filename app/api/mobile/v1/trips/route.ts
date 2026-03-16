import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'
import { mobileTripsResponseSchema } from '@/lib/mobile/contracts'
import { getDriverRouteId, getTripRouteId } from '@/lib/utils/public-ids'

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireMobileDriverApi(request, { previewDriverId })

  if (!context.ok) {
    return NextResponse.json(mobileTripsResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  const trips = await getDriverMobileTrips(context.membership.company_id, context.activeDriver.id, context.supabase)

  return NextResponse.json(
    mobileTripsResponseSchema.parse({
      ok: true,
      active_driver: {
        ...context.activeDriver,
        route_id: getDriverRouteId(context.activeDriver),
      },
      trips: trips.map((trip) => ({
        ...trip,
        route_id: getTripRouteId(trip),
      })),
    }),
  )
}
