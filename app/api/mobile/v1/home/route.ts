import { NextResponse } from 'next/server'

import { requireMobileDriverApi } from '@/lib/auth/require-mobile-driver-api'
import { listDriverDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { mobileHomeResponseSchema } from '@/lib/mobile/contracts'
import { getDriverRouteId, getTripRouteId } from '@/lib/utils/public-ids'
import { formatMinutesAsHours } from '@/lib/utils/workforce'

function startOfTodayIso() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

export async function GET(request: Request) {
  const previewDriverId = new URL(request.url).searchParams.get('driver')
  const context = await requireMobileDriverApi(request, { previewDriverId })

  if (!context.ok) {
    return NextResponse.json(mobileHomeResponseSchema.parse({ error: context.error }), { status: context.status })
  }

  const { membership, activeDriver, supabase, workforceEmployee, previewDriverId: selectedDriverId } = context
  const [trips, documents, mobileTimeSummary] = await Promise.all([
    getDriverMobileTrips(membership.company_id, activeDriver.id, supabase),
    listDriverDocuments(membership.company_id, activeDriver.id, supabase, membership.branchIds),
    workforceEmployee ? getMobileTimeSummary(membership.company_id, workforceEmployee.id, supabase, membership.branchIds) : Promise.resolve(null),
  ])

  const activeTrips = trips.filter((trip) => trip.status === 'started')
  const plannedTrips = trips.filter((trip) => trip.status === 'planned')
  const completedTrips = trips.filter((trip) => trip.status === 'completed' || trip.status === 'invoiced')
  const primaryTrip = activeTrips[0] ?? plannedTrips[0] ?? null
  const documentsByTripId = documents.reduce((map, document) => {
    if (document.related_id) {
      map.set(document.related_id, (map.get(document.related_id) ?? 0) + 1)
    }
    return map
  }, new Map<string, number>())
  const completedWithoutPod = completedTrips.find((trip) => (documentsByTripId.get(trip.id) ?? 0) === 0) ?? null

  const priorityItems = [
    !mobileTimeSummary?.openEntry && membership.role === 'driver' && membership.enabledModules.includes('time')
      ? {
          id: 'clock-in',
          type: 'clock_in',
          title: 'Start shift',
          detail: 'Clock in before dispatch so time and payroll stay aligned.',
          href: '/api/mobile/v1/time/summary',
        }
      : null,
    primaryTrip && primaryTrip.status === 'planned'
      ? {
          id: `start-${primaryTrip.id}`,
          type: 'trip_start',
          title: 'Start next trip',
          detail: `${primaryTrip.customer_name} | ${primaryTrip.pickup_location ?? 'Pickup TBD'} -> ${primaryTrip.delivery_location ?? 'Delivery TBD'}`,
          trip_id: getTripRouteId(primaryTrip),
        }
      : null,
    activeTrips[0]
      ? {
          id: `complete-${activeTrips[0].id}`,
          type: 'trip_complete',
          title: 'Complete live trip',
          detail: `${activeTrips[0].customer_name} is currently in progress.`,
          trip_id: getTripRouteId(activeTrips[0]),
        }
      : null,
    completedWithoutPod
      ? {
          id: `pod-${completedWithoutPod.id}`,
          type: 'delivery_proof',
          title: 'Upload proof of delivery',
          detail: `${completedWithoutPod.customer_name} has no POD or receipt uploaded yet.`,
          trip_id: getTripRouteId(completedWithoutPod),
        }
      : null,
  ].filter(Boolean)

  const timelineItems = [
    ...(mobileTimeSummary?.openEntry
      ? [
          {
            id: `shift-${mobileTimeSummary.openEntry.id}`,
            time: mobileTimeSummary.openEntry.start_time,
            title: 'Shift started',
            detail: mobileTimeSummary.employee?.full_name ?? activeDriver.full_name,
            kind: 'shift',
          },
        ]
      : []),
    ...trips
      .filter((trip) => (trip.scheduled_at ?? trip.start_time ?? trip.created_at) >= startOfTodayIso())
      .map((trip) => ({
        id: `trip-${trip.id}`,
        time: trip.scheduled_at ?? trip.start_time ?? trip.created_at,
        title: trip.customer_name,
        detail: `${trip.pickup_location ?? 'Pickup TBD'} -> ${trip.delivery_location ?? 'Delivery TBD'}`,
        kind: 'trip',
        trip_id: getTripRouteId(trip),
        status: trip.status,
      })),
    ...(mobileTimeSummary?.recentEntries
      .filter((entry) => entry.status !== 'open' && entry.work_date === new Date().toISOString().slice(0, 10))
      .map((entry) => ({
        id: `shift-close-${entry.id}`,
        time: entry.end_time ?? entry.start_time,
        title: 'Shift submitted',
        detail: formatMinutesAsHours(Number(entry.regular_minutes) + Number(entry.overtime_minutes)),
        kind: 'shift',
      })) ?? []),
  ].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime())

  return NextResponse.json(
    mobileHomeResponseSchema.parse({
      ok: true,
      active_driver: {
        ...activeDriver,
        route_id: getDriverRouteId(activeDriver),
      },
      preview_driver_id: selectedDriverId,
      stats: {
        live_trips: activeTrips.length,
        planned_trips: plannedTrips.length,
        document_count: documents.length,
        todays_minutes: mobileTimeSummary?.todaysMinutes ?? 0,
        submitted_minutes: mobileTimeSummary?.submittedMinutes ?? 0,
        approved_week_minutes: mobileTimeSummary?.approvedWeekMinutes ?? 0,
      },
      primary_trip: primaryTrip ? { ...primaryTrip, route_id: getTripRouteId(primaryTrip) } : null,
      priority_items: priorityItems,
      timeline_items: timelineItems,
    }),
  )
}
