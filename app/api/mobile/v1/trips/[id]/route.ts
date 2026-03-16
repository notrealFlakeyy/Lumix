import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { getSignedDocumentUrl } from '@/lib/documents/storage'
import { listTripDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTripById } from '@/lib/db/queries/driver-mobile'
import { listTripCheckpoints } from '@/lib/db/queries/trip-checkpoints'
import { getTripById } from '@/lib/db/queries/trips'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { mobileTripDetailResponseSchema } from '@/lib/mobile/contracts'
import { getTripRouteId } from '@/lib/utils/public-ids'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireMobileDriverApi(request, { previewDriverId })

  if (!context.ok) {
    return NextResponse.json(mobileTripDetailResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  const { id } = await params
  const [trip, tripDetail, mobileTimeSummary] = await Promise.all([
    getDriverMobileTripById(context.membership.company_id, context.activeDriver.id, id, context.supabase),
    getTripById(context.membership.company_id, id, context.supabase),
    context.workforceEmployee
      ? getMobileTimeSummary(context.membership.company_id, context.workforceEmployee.id, context.supabase, context.membership.branchIds)
      : Promise.resolve(null),
  ])

  if (!trip || !tripDetail || tripDetail.trip.driver_id !== context.activeDriver.id) {
    return NextResponse.json(mobileTripDetailResponseSchema.parse({ error: 'Trip not found for this driver.' }), { status: 404 })
  }

  const [tripDocuments, checkpoints] = await Promise.all([
    listTripDocuments(context.membership.company_id, trip.id, context.supabase, context.membership.branchIds),
    listTripCheckpoints(context.membership.company_id, trip.id, context.supabase, context.membership.branchIds),
  ])

  const documents = await Promise.all(
    tripDocuments.map(async (document) => ({
      ...document,
      access_url: await getSignedDocumentUrl(document.file_path),
    })),
  )

  return NextResponse.json(
    mobileTripDetailResponseSchema.parse({
      ok: true,
      trip: {
        ...trip,
        route_id: getTripRouteId(trip),
      },
      detail: tripDetail,
      documents,
      checkpoints,
      time_summary: mobileTimeSummary,
    }),
  )
}
