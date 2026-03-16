import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { VehicleTable } from '@/components/vehicles/vehicle-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listVehicles } from '@/lib/db/queries/vehicles'

export default async function VehiclesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const vehicles = await listVehicles(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Manage fleet records, service planning context, and current odometer values for dispatch."
        actions={
          <Button asChild>
            <Link href="/vehicles/new">
              <Plus className="mr-2 h-4 w-4" />
              New vehicle
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {vehicles.length > 0 ? <VehicleTable vehicles={vehicles} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No vehicles yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
