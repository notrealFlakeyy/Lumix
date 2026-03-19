import { StatCard } from '@/components/dashboard/stat-card'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PageHeader } from '@/components/layout/page-header'
import { PurchaseInvoiceStatusBadge } from '@/components/purchases/purchase-invoice-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { getAccountingOverview } from '@/lib/db/queries/accounting'
import { formatCurrency } from '@/lib/utils/currency'

export default async function AccountingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'accounting')
  const overview = await getAccountingOverview(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounting"
        description="Lightweight finance control across receivables and payables, built from the transport invoicing and purchasing modules already active in the platform."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/invoices">Customer invoices</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/purchases/invoices">Purchase bills</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Receivables" value={formatCurrency(overview.metrics.receivablesOutstanding)} hint="Open customer invoice balance." />
        <StatCard label="Receivables overdue" value={String(overview.metrics.receivablesOverdueCount)} hint="Open customer invoices past due date." />
        <StatCard label="Payables" value={formatCurrency(overview.metrics.payablesOutstanding)} hint="Open supplier bill balance." />
        <StatCard label="Payables overdue" value={String(overview.metrics.payablesOverdueCount)} hint="Supplier bills past due date." />
        <StatCard label="Cash in 30d" value={formatCurrency(overview.metrics.cashCollected30d)} hint="Payments received in the last 30 days." />
        <StatCard label="Cash out 30d" value={formatCurrency(overview.metrics.cashPaid30d)} hint="Supplier payments registered in the last 30 days." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card >
          <CardHeader>
            <CardTitle>Open Receivables</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.receivables.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.receivables.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="text-foreground hover:underline">
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.customer_name}</TableCell>
                      <TableCell>{invoice.branch_name}</TableCell>
                      <TableCell>{invoice.due_date}</TableCell>
                      <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
                      <TableCell><InvoiceStatusBadge status={invoice.status as any} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
                No open customer receivables in the current branch scope.
              </div>
            )}
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Open Payables</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.payables.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.payables.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/purchases/invoices/${invoice.id}`} className="text-foreground hover:underline">
                          {invoice.invoice_number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.vendor_name}</TableCell>
                      <TableCell>{invoice.branch_name}</TableCell>
                      <TableCell>{invoice.due_date ?? '-'}</TableCell>
                      <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
                      <TableCell><PurchaseInvoiceStatusBadge status={invoice.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed px-6 py-10 text-sm text-muted-foreground">
                No open supplier payables in the current branch scope.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card >
        <CardHeader>
          <CardTitle>Working Capital Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div><span className="font-medium text-foreground">Net outstanding:</span> {formatCurrency(overview.metrics.netOutstanding)}</div>
          <div><span className="font-medium text-foreground">Receivables overdue:</span> {overview.metrics.receivablesOverdueCount}</div>
          <div><span className="font-medium text-foreground">Payables overdue:</span> {overview.metrics.payablesOverdueCount}</div>
          <div className="md:col-span-3 rounded-2xl border border-dashed bg-surface px-4 py-4">
            Build deeper accounting workflows on top of live receivables, payables, audit logs, and branch-aware module access without forcing every customer into a full accounting rollout.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
