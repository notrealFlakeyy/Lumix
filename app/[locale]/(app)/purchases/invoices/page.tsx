import { PageHeader } from '@/components/layout/page-header'
import { PurchaseInvoiceTable } from '@/components/purchases/purchase-invoice-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { listPurchaseInvoices } from '@/lib/db/queries/purchases'

export default async function PurchaseInvoicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'purchases')
  const invoices = await listPurchaseInvoices(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Bills"
        description="Track supplier bills, receive stock into inventory, and keep bill payments visible inside the same platform."
        actions={
          <Button asChild>
            <Link href="/purchases/invoices/new">New purchase bill</Link>
          </Button>
        }
      />
      <Card >
        <CardHeader>
          <CardTitle>Open and Recent Bills</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {invoices.length > 0 ? (
            <PurchaseInvoiceTable invoices={invoices} />
          ) : (
            <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
              No purchase bills yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
