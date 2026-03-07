import { Link } from '@/i18n/navigation'
import { ArrowRight, CalendarDays } from 'lucide-react'

import { DriverStatCard } from '@/components/driver/driver-stat-card'
import { DriverTripCard } from '@/components/driver/driver-trip-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { listDriverDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'
import { formatDateTime } from '@/lib/utils/dates'
import { getDriverRouteId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function DriverHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ driver?: string }>
}) {
  const { locale } = await params
  const { driver: previewDriverId } = await searchParams
  const context = await getDriverPortalContext(locale, previewDriverId)
  const { membership, activeDriver, activeDrivers, isPreviewMode, previewDriverId: selectedDriverId } = context

  const trips = activeDriver ? await getDriverMobileTrips(membership.company_id, activeDriver.id, context.supabase) : []
  const documents = activeDriver ? await listDriverDocuments(membership.company_id, activeDriver.id, context.supabase) : []

  const activeTrips = trips.filter((trip) => trip.status === 'started')
  const plannedTrips = trips.filter((trip) => trip.status === 'planned')
  const completedTrips = trips.filter((trip) => trip.status === 'completed' || trip.status === 'invoiced')
  const primaryTrip = activeTrips[0] ?? plannedTrips[0] ?? null

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{activeDriver ? activeDriver.full_name : 'Driver profile not linked'}</CardTitle>
              <CardDescription className="mt-1">
                {activeDriver
                  ? "Today's transport view for field reporting, trip progression, and delivery documents."
                  : membership.role === 'driver'
                    ? 'No active driver row matches this signed-in user yet.'
                    : 'Select an active driver to preview the mobile workflow.'}
              </CardDescription>
            </div>
            {isPreviewMode ? <Badge variant="warning">Preview mode</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {activeDriver ? (
            <>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span>{new Intl.DateTimeFormat('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
              </div>
              <div><span className="font-medium text-slate-900">Phone:</span> {activeDriver.phone ?? '-'}</div>
              <div><span className="font-medium text-slate-900">Email:</span> {activeDriver.email ?? '-'}</div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              {membership.role === 'driver'
                ? 'Create a drivers row with the same email as this login, or set the profile full name to match an existing driver.'
                : 'Choose one of the active drivers below to open the mobile workflow with real trip data.'}
            </div>
          )}
        </CardContent>
      </Card>

      {membership.role !== 'driver' && activeDrivers.length > 0 ? (
        <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
          <CardHeader className="pb-4">
            <CardTitle>Choose driver preview</CardTitle>
            <CardDescription>Use the ERP seed data to present the field workflow without creating a separate mobile app.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {activeDrivers.map((driver) => (
              <Button key={driver.id} asChild variant={selectedDriverId === getDriverRouteId(driver) ? 'default' : 'outline'} className="justify-start">
                <Link href={`/driver?driver=${getDriverRouteId(driver)}`}>{driver.full_name}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {activeDriver ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <DriverStatCard label="Live" value={String(activeTrips.length)} />
            <DriverStatCard label="Planned" value={String(plannedTrips.length)} />
            <DriverStatCard label="Docs" value={String(documents.length)} />
          </div>

          {primaryTrip ? (
            <Card className="overflow-hidden border-slate-900 bg-slate-950 text-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.9)]">
              <CardHeader className="pb-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-sky-200/85">Current focus</div>
                <CardTitle className="text-xl">{primaryTrip.customer_name}</CardTitle>
                <CardDescription className="text-slate-300">
                  {primaryTrip.pickup_location ?? 'Pickup TBD'} {'->'} {primaryTrip.delivery_location ?? 'Delivery TBD'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-200">
                <div>Scheduled: {formatDateTime(primaryTrip.scheduled_at)}</div>
                <div>Vehicle: {primaryTrip.vehicle_name}</div>
                <Button asChild className="w-full bg-white text-slate-950 hover:bg-slate-100">
                  <Link href={selectedDriverId ? `/driver/trips/${getTripRouteId(primaryTrip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(primaryTrip)}`}>
                    Open live trip workflow
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-slate-300 bg-white/90">
              <CardContent className="p-6 text-sm text-slate-600">No started or planned trips are currently assigned. New dispatches will appear here automatically.</CardContent>
            </Card>
          )}

          {plannedTrips.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Next dispatches</h2>
                <Link href={selectedDriverId ? `/driver/trips?driver=${selectedDriverId}` : '/driver/trips'} className="text-sm font-medium text-sky-700">
                  View all
                </Link>
              </div>
              {plannedTrips.slice(0, 2).map((trip) => (
                <DriverTripCard key={trip.id} locale={locale} trip={trip} previewDriverId={selectedDriverId} />
              ))}
            </section>
          ) : null}

          {completedTrips.length > 0 ? (
            <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
              <CardHeader className="pb-4">
                <CardTitle>Recently completed</CardTitle>
                <CardDescription>Delivered jobs remain visible for invoice follow-through and proof of delivery review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTrips.slice(0, 3).map((trip) => (
                  <Link
                    key={trip.id}
                    href={selectedDriverId ? `/driver/trips/${getTripRouteId(trip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(trip)}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <span>{trip.customer_name}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
