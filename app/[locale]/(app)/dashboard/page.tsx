import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/layout/page-header'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import {
  getDashboardStats,
  getRecentInvoices,
  getRecentOrders,
  getRevenueByCustomer,
  getRevenueByDriver,
  getRevenueByVehicle,
} from '@/lib/db/queries/dashboard'
import { platformModuleDefinitions } from '@/lib/platform/modules'
import { formatCurrency } from '@/lib/utils/currency'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership, supabase } = await requireCompany(locale)

  if (membership.role === 'driver' && membership.enabledModules.includes('transport')) {
    redirect(`/${locale}/driver`)
  }

  const companyId = membership.company_id

  if (!membership.enabledModules.includes('transport')) {
    const [{ count: branchCount }, { count: teamCount }, { count: documentCount }, { count: customerCount }] = await Promise.all([
      supabase.from('branches').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('company_users').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
      supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
    ])

    const enabledModules = platformModuleDefinitions.filter((definition) => membership.enabledModules.includes(definition.key))

    return (
      <div className="space-y-8">
        <PageHeader
          title="Platform Overview"
          description="This tenant is running a modular workspace without the transport suite enabled. Use the core dashboard to review module footprint, branches, team scope, and rollout readiness."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Enabled Modules" value={String(enabledModules.length)} hint="Core is always enabled. Add vertical modules per client need." />
          <StatCard label="Active Team Members" value={String(teamCount ?? 0)} hint="Active company memberships in this tenant." />
          <StatCard label="Configured Branches" value={String(branchCount ?? 0)} hint="Use branches when the client operates by depot, warehouse, terminal, or office." />
          <StatCard label="Stored Documents" value={String(documentCount ?? 0)} hint="Documents remain shared platform infrastructure even when transport is disabled." />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Enabled Module Stack</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {enabledModules.map((module) => (
                <div key={module.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{module.label}</div>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{module.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>Platform Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-medium text-slate-950">Customer master data</div>
                <div className="mt-1">{customerCount ?? 0} customer records available for invoicing, inventory handoff, or future module expansion.</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-medium text-slate-950">Branch foundation</div>
                <div className="mt-1">
                  {branchCount && branchCount > 0
                    ? `This tenant already has ${branchCount} configured branch${branchCount === 1 ? '' : 'es'}.`
                    : 'No branches configured yet. Keep the workspace simple until the client needs branch-specific permissions.'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="font-medium text-slate-950">Next expansion step</div>
                <div className="mt-1">Enable additional modules in Settings when the client’s scope grows instead of creating a separate app fork.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const [stats, revenueByCustomer, revenueByVehicle, revenueByDriver, recentOrders, recentInvoices] = await Promise.all([
    getDashboardStats(companyId, undefined, membership.branchIds),
    getRevenueByCustomer(companyId, undefined, membership.branchIds),
    getRevenueByVehicle(companyId, undefined, membership.branchIds),
    getRevenueByDriver(companyId, undefined, membership.branchIds),
    getRecentOrders(companyId, undefined, membership.branchIds),
    getRecentInvoices(companyId, undefined, membership.branchIds),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Transportation operations overview focused on dispatch load, monthly revenue, estimated margin, completed trips, and invoice follow-up."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard label="Revenue This Month" value={formatCurrency(stats.revenueThisMonth)} hint="Issued invoice total in the current month." />
        <StatCard
          label="Estimated Cost This Month"
          value={formatCurrency(stats.estimatedCostThisMonth)}
          hint="Fuel, maintenance, driver-time, and waiting assumptions."
        />
        <StatCard
          label="Estimated Margin This Month"
          value={formatCurrency(stats.estimatedMarginThisMonth)}
          hint="Revenue minus estimated trip operating cost."
        />
        <StatCard label="Active Orders" value={String(stats.activeOrders)} />
        <StatCard label="Completed Trips This Month" value={String(stats.completedTripsThisMonth)} />
        <StatCard label="Overdue Invoices" value={String(stats.overdueInvoices)} />
        <StatCard label="Fleet Utilization (7d)" value={`${Math.round(stats.fleetUtilization)}%`} hint="Active vehicles with a trip in the last 7 days." />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RevenueChart title="Revenue by Customer" data={revenueByCustomer} />
        <RevenueChart title="Revenue by Vehicle" subtitle="Estimated revenue by vehicle" data={revenueByVehicle} />
        <RevenueChart title="Revenue by Driver" subtitle="Estimated revenue by driver" data={revenueByDriver} />
      </div>

      <RecentActivity orders={recentOrders} invoices={recentInvoices} />
    </div>
  )
}
