import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getCustomerById } from '@/lib/db/queries/customers'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { toNumber } from '@/lib/utils/numbers'
import { getTripDisplayId, getTripRouteId } from '@/lib/utils/public-ids'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireCompany(locale)
  const result = await getCustomerById(membership.company_id, id, undefined, membership.branchIds)

  if (!result) return null

  const { customer, orders, trips, invoices } = result

  return (
    <div className="space-y-6">
      <PageHeader title={customer.name} description="Customer account details and related transport activity." actions={<Button asChild variant="outline"><Link href={`/customers/${customer.id}/edit`}>Edit customer</Link></Button>} />

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div><span className="font-medium text-slate-900">Business ID:</span> {customer.business_id ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Branch:</span> {customer.branch_name ?? '-'}</div>
            <div><span className="font-medium text-slate-900">VAT Number:</span> {customer.vat_number ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Email:</span> {customer.email ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Phone:</span> {customer.phone ?? '-'}</div>
            <div><span className="font-medium text-slate-900">City:</span> {customer.billing_city ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Address:</span> {[customer.billing_address_line1, customer.billing_address_line2].filter(Boolean).join(', ') || '-'}</div>
            <div><span className="font-medium text-slate-900">Notes:</span> {customer.notes ?? '-'}</div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Related Orders</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><Link href={`/orders/${order.id}`}>{order.order_number}</Link></TableCell>
                      <TableCell>{order.branch_name ?? '-'}</TableCell>
                      <TableCell>{order.pickup_location}</TableCell>
                      <TableCell>{order.delivery_location}</TableCell>
                      <TableCell>{formatDateTime(order.scheduled_at)}</TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Related Trips</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell><Link href={`/trips/${getTripRouteId(trip)}`}>{getTripDisplayId(trip)}</Link></TableCell>
                      <TableCell>{trip.branch_name ?? '-'}</TableCell>
                      <TableCell>{formatDateTime(trip.start_time)}</TableCell>
                      <TableCell>{formatDateTime(trip.end_time)}</TableCell>
                      <TableCell>{trip.distance_km ? `${toNumber(trip.distance_km)} km` : '-'}</TableCell>
                      <TableCell>{trip.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Related Invoices</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
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
                      <TableCell><Link href={`/invoices/${invoice.id}`}>{invoice.invoice_number}</Link></TableCell>
                      <TableCell>{invoice.branch_name ?? '-'}</TableCell>
                      <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell>{formatCurrency(toNumber(invoice.total))}</TableCell>
                      <TableCell>{invoice.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
