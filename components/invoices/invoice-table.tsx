import { Link } from '@/i18n/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/dates'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'

export function InvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: string
    invoice_number: string
    branch_name?: string
    customer_name: string
    issue_date: string
    due_date: string
    total: string
    status: any
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice Number</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Issue Date</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link href={`/invoices/${invoice.id}`} className="text-foreground no-underline hover:text-[rgb(var(--app-accent))]">
                {invoice.invoice_number}
              </Link>
            </TableCell>
            <TableCell className="max-w-[180px]">
              <span className="block truncate">{invoice.customer_name}</span>
            </TableCell>
            <TableCell>{invoice.branch_name ?? '—'}</TableCell>
            <TableCell>{formatDate(invoice.issue_date)}</TableCell>
            <TableCell>{formatDate(invoice.due_date)}</TableCell>
            <TableCell>{formatCurrency(Number(invoice.total ?? 0))}</TableCell>
            <TableCell>
              <InvoiceStatusBadge status={invoice.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
