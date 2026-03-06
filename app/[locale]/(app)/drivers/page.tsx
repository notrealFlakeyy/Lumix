import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { DriverTable } from '@/components/drivers/driver-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listDrivers } from '@/lib/db/queries/drivers'

export default async function DriversPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const drivers = await listDrivers(membership.company_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Maintain active drivers, license details, and assignment readiness."
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="mr-2 h-4 w-4" />
              New driver
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {drivers.length > 0 ? <DriverTable drivers={drivers} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No drivers yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
