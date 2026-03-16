import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { formatCurrency } from '@/lib/utils/currency'
import { PurchaseInvoiceStatusBadge } from '@/components/purchases/purchase-invoice-status-badge'

export function PurchaseInvoiceTable({
  invoices,
}: {
  invoices: Array<{
    id: string
    invoice_number: string
    vendor_name: string
    branch_name: string
    status: string
    invoice_date: string
    due_date: string | null
    total: string | number
    balance_due: number
    receipt_progress_label: string
  }>
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bill</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Invoice date</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Receipts</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">
              <Link href={`/purchases/invoices/${invoice.id}`} className="text-slate-950 hover:underline">
                {invoice.invoice_number}
              </Link>
            </TableCell>
            <TableCell>{invoice.vendor_name}</TableCell>
            <TableCell>{invoice.branch_name}</TableCell>
            <TableCell>{invoice.invoice_date}</TableCell>
            <TableCell>{invoice.due_date ?? '-'}</TableCell>
            <TableCell>{formatCurrency(Number(invoice.total))}</TableCell>
            <TableCell>{formatCurrency(invoice.balance_due)}</TableCell>
            <TableCell>{invoice.receipt_progress_label}</TableCell>
            <TableCell><PurchaseInvoiceStatusBadge status={invoice.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
