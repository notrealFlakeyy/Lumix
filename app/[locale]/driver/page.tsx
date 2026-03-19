import { Link } from '@/i18n/navigation'
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileCheck, PlayCircle } from 'lucide-react'

import { DriverInstallPrompt } from '@/components/driver/install-prompt'
import { DriverStatCard } from '@/components/driver/driver-stat-card'
import { DriverTripCard } from '@/components/driver/driver-trip-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { getCurrentWorkforceEmployee } from '@/lib/auth/get-current-workforce-employee'
import { listDriverDocuments } from '@/lib/db/queries/documents'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'
import { getMobileTimeSummary } from '@/lib/db/queries/workforce-mobile'
import { formatDateTime } from '@/lib/utils/dates'
import { formatMinutesAsHours } from '@/lib/utils/workforce'
import { getDriverRouteId, getTripRouteId } from '@/lib/utils/public-ids'

function startOfTodayIso() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString()
}

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
  const documents = activeDriver ? await listDriverDocuments(membership.company_id, activeDriver.id, context.supabase, membership.branchIds) : []
  const showTimeModule = membership.enabledModules.includes('time')
  const workforceContext = showTimeModule && membership.role === 'driver' ? await getCurrentWorkforceEmployee(membership.company_id) : null
  const mobileTimeSummary = workforceContext?.employee
    ? await getMobileTimeSummary(membership.company_id, workforceContext.employee.id, context.supabase, membership.branchIds)
    : null

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
    !mobileTimeSummary?.openEntry && membership.role === 'driver' && showTimeModule
      ? {
          id: 'clock-in',
          title: 'Start shift',
          detail: 'Clock in before dispatch so time and payroll stay aligned.',
          href: '/driver/time',
          icon: Clock3,
          tone: 'warning' as const,
        }
      : null,
    primaryTrip && primaryTrip.status === 'planned'
      ? {
          id: `start-${primaryTrip.id}`,
          title: 'Start next trip',
          detail: `${primaryTrip.customer_name} | ${primaryTrip.pickup_location ?? 'Pickup TBD'} -> ${primaryTrip.delivery_location ?? 'Delivery TBD'}`,
          href: selectedDriverId ? `/driver/trips/${getTripRouteId(primaryTrip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(primaryTrip)}`,
          icon: PlayCircle,
          tone: 'default' as const,
        }
      : null,
    activeTrips[0]
      ? {
          id: `complete-${activeTrips[0].id}`,
          title: 'Complete live trip',
          detail: `${activeTrips[0].customer_name} is currently in progress.`,
          href: selectedDriverId ? `/driver/trips/${getTripRouteId(activeTrips[0])}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(activeTrips[0])}`,
          icon: CheckCircle2,
          tone: 'success' as const,
        }
      : null,
    completedWithoutPod
      ? {
          id: `pod-${completedWithoutPod.id}`,
          title: 'Upload proof of delivery',
          detail: `${completedWithoutPod.customer_name} has no POD or receipt uploaded yet.`,
          href: selectedDriverId ? `/driver/trips/${getTripRouteId(completedWithoutPod)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(completedWithoutPod)}`,
          icon: FileCheck,
          tone: 'warning' as const,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      id: string
      title: string
      detail: string
      href: string
      icon: typeof Clock3
      tone: 'warning' | 'default' | 'success'
    } => Boolean(item),
  )
  const timelineItems = [
    ...(mobileTimeSummary?.openEntry
      ? [
          {
            id: `shift-${mobileTimeSummary.openEntry.id}`,
            time: mobileTimeSummary.openEntry.start_time,
            title: 'Shift started',
            detail: mobileTimeSummary.employee?.full_name ?? activeDriver?.full_name ?? 'Employee',
            kind: 'shift' as const,
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
        kind: 'trip' as const,
        href: selectedDriverId ? `/driver/trips/${getTripRouteId(trip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(trip)}`,
        status: trip.status,
      })),
    ...(mobileTimeSummary?.recentEntries
      .filter((entry) => entry.status !== 'open' && entry.work_date === new Date().toISOString().slice(0, 10))
      .map((entry) => ({
        id: `shift-close-${entry.id}`,
        time: entry.end_time ?? entry.start_time,
        title: 'Shift submitted',
        detail: formatMinutesAsHours(entry.regular_minutes + entry.overtime_minutes),
        kind: 'shift' as const,
      })) ?? []),
  ].sort((left, right) => new Date(left.time).getTime() - new Date(right.time).getTime())

  return (
    <div className="space-y-4">
      {activeDriver ? <DriverInstallPrompt /> : null}

      <Card className="shadow-softSm">
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
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {activeDriver ? (
            <>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{new Intl.DateTimeFormat('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
              </div>
              <div><span className="font-medium text-foreground">Phone:</span> {activeDriver.phone ?? '-'}</div>
              <div><span className="font-medium text-foreground">Email:</span> {activeDriver.email ?? '-'}</div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
              {membership.role === 'driver'
                ? 'Link this login to a driver row through drivers.auth_user_id, or use matching email/full name as a temporary fallback.'
                : 'Choose one of the active drivers below to open the mobile workflow with real trip data.'}
            </div>
          )}
        </CardContent>
      </Card>

      {membership.role !== 'driver' && activeDrivers.length > 0 ? (
        <Card className="shadow-softSm">
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

          {priorityItems.length > 0 ? (
            <Card className="shadow-softSm">
              <CardHeader className="pb-4">
                <CardTitle>Next actions</CardTitle>
                <CardDescription>Clear, field-ready priorities based on today’s shift and trip state.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start gap-3 rounded-2xl border border-border/20 px-4 py-4 text-sm text-muted-foreground"
                    >
                      <div className="rounded-xl bg-[rgb(var(--app-surface-2))] p-2 text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-foreground">{item.title}</div>
                          <Badge variant={item.tone}>{item.tone === 'success' ? 'Ready' : item.tone === 'warning' ? 'Attention' : 'Open'}</Badge>
                        </div>
                        <div className="mt-1">{item.detail}</div>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          ) : null}

          {showTimeModule ? (
            <Card className="shadow-softSm">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>Shift status</CardTitle>
                    <CardDescription>Clocking and payroll-ready hours live in the same mobile workflow.</CardDescription>
                  </div>
                  {mobileTimeSummary?.openEntry ? <Badge variant="success">Clocked in</Badge> : <Badge variant="default">Off shift</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                {membership.role === 'driver' ? (
                  workforceContext?.employee && mobileTimeSummary ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <DriverStatCard label="Today" value={formatMinutesAsHours(mobileTimeSummary.todaysMinutes)} />
                        <DriverStatCard label="Submitted" value={formatMinutesAsHours(mobileTimeSummary.submittedMinutes)} />
                        <DriverStatCard label="Week" value={formatMinutesAsHours(mobileTimeSummary.approvedWeekMinutes)} />
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/driver/time">Open shift workflow</Link>
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed px-4 py-4">
                      Your login is not linked to a workforce employee yet. An admin can link it in Settings.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed px-4 py-4">
                    Shift tools are available to the signed-in driver when the Time module is enabled.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {primaryTrip ? (
            <Card className="overflow-hidden border-[rgba(var(--app-contrast),0.9)] bg-[rgb(var(--app-contrast))] text-[rgb(var(--app-surface))] shadow-[0_24px_60px_-36px_rgba(15,23,42,0.9)]">
              <CardHeader className="pb-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[rgba(var(--app-accent),0.85)]">Current focus</div>
                <CardTitle className="text-xl">{primaryTrip.customer_name}</CardTitle>
                <CardDescription className="text-[rgb(var(--app-surface-2))]">
                  {primaryTrip.pickup_location ?? 'Pickup TBD'} {'->'} {primaryTrip.delivery_location ?? 'Delivery TBD'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[rgb(var(--app-surface-2))]">
                <div>Scheduled: {formatDateTime(primaryTrip.scheduled_at)}</div>
                <div>Vehicle: {primaryTrip.vehicle_name}</div>
                <Button asChild className="w-full bg-[rgb(var(--app-surface))] text-foreground hover:bg-[rgb(var(--app-surface-2))]">
                  <Link href={selectedDriverId ? `/driver/trips/${getTripRouteId(primaryTrip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(primaryTrip)}`}>
                    Open live trip workflow
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/30 bg-[rgba(var(--app-surface),0.9)]">
              <CardContent className="p-6 text-sm text-muted-foreground">No started or planned trips are currently assigned. New dispatches will appear here automatically.</CardContent>
            </Card>
          )}

          {plannedTrips.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next dispatches</h2>
                <Link href={selectedDriverId ? `/driver/trips?driver=${selectedDriverId}` : '/driver/trips'} className="text-sm font-medium text-[rgb(var(--app-accent))]">
                  View all
                </Link>
              </div>
              {plannedTrips.slice(0, 2).map((trip) => (
                <DriverTripCard key={trip.id} locale={locale} trip={trip} previewDriverId={selectedDriverId} />
              ))}
            </section>
          ) : null}

          {completedTrips.length > 0 ? (
            <Card className="shadow-softSm">
              <CardHeader className="pb-4">
                <CardTitle>Recently completed</CardTitle>
                <CardDescription>Delivered jobs remain visible for invoice follow-through and proof of delivery review.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTrips.slice(0, 3).map((trip) => (
                  <Link
                    key={trip.id}
                    href={selectedDriverId ? `/driver/trips/${getTripRouteId(trip)}?driver=${selectedDriverId}` : `/driver/trips/${getTripRouteId(trip)}`}
                    className="flex items-center justify-between rounded-2xl border border-border/20 bg-surface px-4 py-3 text-sm text-muted-foreground"
                  >
                    <span>{trip.customer_name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {timelineItems.length > 0 ? (
            <Card className="shadow-softSm">
              <CardHeader className="pb-4">
                <CardTitle>Today timeline</CardTitle>
                <CardDescription>Shift milestones and assigned work in one field-facing sequence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {timelineItems.map((item) =>
                  item.kind === 'trip' ? (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border/20 px-4 py-4 text-sm text-muted-foreground"
                    >
                      <div>
                        <div className="font-medium text-foreground">{item.title}</div>
                        <div className="mt-1">{item.detail}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.time)}</div>
                      </div>
                      <Badge variant={item.status === 'started' ? 'success' : 'default'}>{item.status}</Badge>
                    </Link>
                  ) : (
                    <div key={item.id} className="rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="mt-1">{item.detail}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.time)}</div>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
