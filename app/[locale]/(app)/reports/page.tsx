import { PageHeader } from '@/components/layout/page-header'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { ReportCard } from '@/components/reports/report-card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getRevenueByCustomer, getRevenueByDriver, getRevenueByVehicle } from '@/lib/db/queries/dashboard'
import { getInvoiceStatusSummary, getTripVolumeOverTime } from '@/lib/db/queries/reports'
import { formatCurrency } from '@/lib/utils/currency'

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const companyId = membership.company_id
  const [customerRevenue, vehicleRevenue, driverRevenue, invoiceStatusSummary, tripVolume] = await Promise.all([
    getRevenueByCustomer(companyId),
    getRevenueByVehicle(companyId),
    getRevenueByDriver(companyId),
    getInvoiceStatusSummary(companyId),
    getTripVolumeOverTime(companyId),
  ])

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Revenue and operational reporting foundation for transportation workflows." />

      <div className="grid gap-6 xl:grid-cols-3">
        <RevenueChart title="Revenue by Customer" data={customerRevenue} />
        <RevenueChart title="Revenue by Vehicle" subtitle="Estimated revenue by vehicle" data={vehicleRevenue} />
        <RevenueChart title="Revenue by Driver" subtitle="Estimated revenue by driver" data={driverRevenue} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportCard title="Invoice Status Summary">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceStatusSummary.map((row) => (
                <TableRow key={row.status}>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{formatCurrency(row.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Trip Count Over Time">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Trip Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tripVolume.map((row) => (
                <TableRow key={row.period}>
                  <TableCell>{row.period}</TableCell>
                  <TableCell>{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>
      </div>
    </div>
  )
}
