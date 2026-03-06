import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { CustomerTable } from '@/components/customers/customer-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listCustomers } from '@/lib/db/queries/customers'

export default async function CustomersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const customers = await listCustomers(membership.company_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Maintain transport customers, billing contacts, and account context for dispatch and invoicing."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              New customer
            </Link>
          </Button>
        }
      />

      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {customers.length > 0 ? <CustomerTable customers={customers} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No customers yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
