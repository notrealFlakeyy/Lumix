import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TripTable } from '@/components/trips/trip-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listTrips } from '@/lib/db/queries/trips'

export default async function TripsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const trips = await listTrips(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Monitor trip execution, odometer capture, waiting time, and invoicing readiness."
        actions={
          <Button asChild>
            <Link href="/trips/new">
              <Plus className="mr-2 h-4 w-4" />
              New trip
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {trips.length > 0 ? <TripTable trips={trips} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No trips yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
