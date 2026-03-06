import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { InvoiceTable } from '@/components/invoices/invoice-table'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { listInvoices } from '@/lib/db/queries/invoices'

export default async function InvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const invoices = await listInvoices(membership.company_id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage billing, payment follow-up, and invoice lifecycle across completed transport work."
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New invoice
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {invoices.length > 0 ? <InvoiceTable invoices={invoices} /> : <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No invoices yet.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
