import { PageHeader } from '@/components/layout/page-header'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { ReportCard } from '@/components/reports/report-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireCompany } from '@/lib/auth/require-company'
import { getRevenueByCustomer, getRevenueByDriver, getRevenueByVehicle } from '@/lib/db/queries/dashboard'
import {
  getEstimatedMarginByCustomer,
  getEstimatedMarginByDriver,
  getEstimatedMarginByVehicle,
  getInvoiceStatusSummary,
  getTripProfitabilityRows,
  getTripVolumeOverTime,
} from '@/lib/db/queries/reports'
import { platformModuleDefinitions } from '@/lib/platform/modules'
import { formatCurrency } from '@/lib/utils/currency'

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership, supabase } = await requireCompany(locale)
  const companyId = membership.company_id

  if (!membership.enabledModules.includes('transport')) {
    const [{ count: branchCount }, { count: teamCount }, { count: activeDrivers }] = await Promise.all([
      supabase.from('branches').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    ])

    const enabledModules = platformModuleDefinitions.filter((definition) => membership.enabledModules.includes(definition.key))

    return (
      <div className="space-y-8">
        <PageHeader
          title="Platform Reports"
          description="This tenant does not currently have the transport suite enabled, so the reporting surface focuses on module footprint and rollout structure rather than dispatch revenue."
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <Card >
            <CardHeader>
              <CardTitle>Enabled Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enabledModules.map((module) => (
                <div key={module.key} className="flex items-start justify-between gap-3 rounded-xl border border-border/20 bg-surface px-4 py-4 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{module.label}</div>
                    <div className="mt-1 text-muted-foreground">{module.description}</div>
                  </div>
                  <Badge variant="success">Enabled</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card >
            <CardHeader>
              <CardTitle>Operational Footprint</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Configured branches</TableCell>
                    <TableCell>{branchCount ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Active team members</TableCell>
                    <TableCell>{teamCount ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Active drivers</TableCell>
                    <TableCell>{activeDrivers ?? 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Transport reporting mode</TableCell>
                    <TableCell>Disabled until the transport module is enabled</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const [
    customerRevenue,
    vehicleRevenue,
    driverRevenue,
    marginByCustomer,
    marginByVehicle,
    marginByDriver,
    tripProfitability,
    invoiceStatusSummary,
    tripVolume,
  ] = await Promise.all([
    getRevenueByCustomer(companyId, undefined, membership.branchIds),
    getRevenueByVehicle(companyId, undefined, membership.branchIds),
    getRevenueByDriver(companyId, undefined, membership.branchIds),
    getEstimatedMarginByCustomer(companyId, undefined, membership.branchIds),
    getEstimatedMarginByVehicle(companyId, undefined, membership.branchIds),
    getEstimatedMarginByDriver(companyId, undefined, membership.branchIds),
    getTripProfitabilityRows(companyId, undefined, membership.branchIds),
    getInvoiceStatusSummary(companyId, undefined, membership.branchIds),
    getTripVolumeOverTime(companyId, undefined, membership.branchIds),
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
        <ReportCard title="Estimated Margin by Customer" subtitle="Revenue minus modeled operating cost. Use as a directional planning view, not exact accounting.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Estimated Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marginByCustomer.slice(0, 6).map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="font-medium text-foreground">{row.label}</div>
                    {row.marginPercent !== null ? <div className="text-xs text-muted-foreground">{row.marginPercent}% margin</div> : null}
                  </TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.estimatedCost)}</TableCell>
                  <TableCell className={row.estimatedMargin < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(row.estimatedMargin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Estimated Margin by Vehicle" subtitle="Best used for fleet planning and route allocation conversations.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Estimated Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marginByVehicle.slice(0, 6).map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="font-medium text-foreground">{row.label}</div>
                    {row.marginPercent !== null ? <div className="text-xs text-muted-foreground">{row.marginPercent}% margin</div> : null}
                  </TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.estimatedCost)}</TableCell>
                  <TableCell className={row.estimatedMargin < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(row.estimatedMargin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportCard title="Estimated Margin by Driver" subtitle="Directional driver contribution view based on linked trip revenue and default cost assumptions.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Estimated Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marginByDriver.slice(0, 6).map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="font-medium text-foreground">{row.label}</div>
                    {row.marginPercent !== null ? <div className="text-xs text-muted-foreground">{row.marginPercent}% margin</div> : null}
                  </TableCell>
                  <TableCell>{formatCurrency(row.revenue)}</TableCell>
                  <TableCell>{formatCurrency(row.estimatedCost)}</TableCell>
                  <TableCell className={row.estimatedMargin < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(row.estimatedMargin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ReportCard>

        <ReportCard title="Trip Profitability Snapshot" subtitle="Lowest estimated margins first so dispatch issues stand out before invoicing slips.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Estimated Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...tripProfitability]
                .sort((a, b) => a.estimatedMargin - b.estimatedMargin)
                .slice(0, 6)
                .map((row) => (
                  <TableRow key={row.tripId}>
                    <TableCell>
                      <div className="font-medium text-foreground">{row.tripReference}</div>
                      <div className="text-xs text-muted-foreground">{row.status}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.customerName}</div>
                      <div className="text-xs text-muted-foreground">{row.vehicleLabel}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(row.revenue)}</TableCell>
                    <TableCell>{formatCurrency(row.estimatedCost)}</TableCell>
                    <TableCell className={row.estimatedMargin < 0 ? 'text-rose-600' : 'text-emerald-700'}>{formatCurrency(row.estimatedMargin)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ReportCard>
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

        <ReportCard title="Trip Count Over Time" subtitle="Use this with the profitability tables above to spot growth without mistaking it for healthy margin.">
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
