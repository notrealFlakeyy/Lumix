import { StatCard } from '@/components/dashboard/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { PurchaseInvoiceStatusBadge } from '@/components/purchases/purchase-invoice-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { getPurchasesOverview } from '@/lib/db/queries/purchases'
import { formatCurrency } from '@/lib/utils/currency'

export default async function PurchasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'purchases')
  const overview = await getPurchasesOverview(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Purchases"
        description="Supplier-side procurement, receiving, and bill control for clients that want purchasing inside the same platform as inventory and transport."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/purchases/vendors">Vendors</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/purchases/invoices">Purchase bills</Link>
            </Button>
            <Button asChild>
              <Link href="/purchases/invoices/new">New purchase bill</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <StatCard label="Vendors" value={String(overview.vendorCount)} />
        <StatCard label="Open bills" value={String(overview.openInvoiceCount)} />
        <StatCard label="Overdue" value={String(overview.overdueInvoiceCount)} />
        <StatCard label="Outstanding" value={formatCurrency(overview.outstandingAmount)} />
        <StatCard label="Pending receipts" value={String(overview.pendingReceiptCount)} />
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Recent Purchase Bills</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {overview.recentInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Receipts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link href={`/purchases/invoices/${invoice.id}`} className="text-foreground hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.vendor_name}</TableCell>
                    <TableCell>{invoice.branch_name}</TableCell>
                    <TableCell>{invoice.due_date ?? '-'}</TableCell>
                    <TableCell>{formatCurrency(Number(invoice.total))}</TableCell>
                    <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
                    <TableCell>{invoice.receipt_progress_label}</TableCell>
                    <TableCell><PurchaseInvoiceStatusBadge status={invoice.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
