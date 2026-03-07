import { redirect } from 'next/navigation'

import { Link } from '@/i18n/navigation'
import { DriverTripCard } from '@/components/driver/driver-trip-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getDriverPortalContext } from '@/lib/auth/get-driver-portal-context'
import { getDriverMobileTrips } from '@/lib/db/queries/driver-mobile'

export default async function DriverTripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ driver?: string }>
}) {
  const { locale } = await params
  const { driver: previewDriverId } = await searchParams
  const context = await getDriverPortalContext(locale, previewDriverId)
  const { activeDriver, membership, previewDriverId: selectedDriverId } = context

  if (!activeDriver) {
    redirect(`/${locale}/driver`)
  }

  const trips = await getDriverMobileTrips(membership.company_id, activeDriver.id, context.supabase)
  const sections = [
    { title: 'Started', trips: trips.filter((trip) => trip.status === 'started') },
    { title: 'Planned', trips: trips.filter((trip) => trip.status === 'planned') },
    { title: 'Completed', trips: trips.filter((trip) => trip.status === 'completed' || trip.status === 'invoiced') },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
        <CardHeader className="pb-4">
          <CardTitle>Assigned trips</CardTitle>
          <CardDescription>All trips currently linked to {activeDriver.full_name}. Use the trip workflow page for live odometer and delivery reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href={selectedDriverId ? `/driver?driver=${selectedDriverId}` : '/driver'}>Back to home summary</Link>
          </Button>
        </CardContent>
      </Card>

      {sections.map((section) =>
        section.trips.length > 0 ? (
          <section key={section.title} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{section.title}</h2>
            {section.trips.map((trip) => (
              <DriverTripCard key={trip.id} locale={locale} trip={trip} previewDriverId={selectedDriverId} />
            ))}
          </section>
        ) : null,
      )}

      {trips.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/90">
          <CardContent className="p-6 text-sm text-slate-600">No trips are assigned to this driver yet.</CardContent>
        </Card>
      ) : null}
    </div>
  )
}
