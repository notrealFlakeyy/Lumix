import { redirect } from 'next/navigation'

import { PageHeader } from '@/components/layout/page-header'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { requireCompany } from '@/lib/auth/require-company'
import {
  getDashboardStats,
  getRecentInvoices,
  getRecentOrders,
  getRevenueByCustomer,
  getRevenueByDriver,
  getRevenueByVehicle,
} from '@/lib/db/queries/dashboard'
import { formatCurrency } from '@/lib/utils/currency'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)

  if (membership.role === 'driver') {
    redirect(`/${locale}/driver`)
  }

  const companyId = membership.company_id

  const [stats, revenueByCustomer, revenueByVehicle, revenueByDriver, recentOrders, recentInvoices] = await Promise.all([
    getDashboardStats(companyId),
    getRevenueByCustomer(companyId),
    getRevenueByVehicle(companyId),
    getRevenueByDriver(companyId),
    getRecentOrders(companyId),
    getRecentInvoices(companyId),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Transportation operations overview focused on dispatch load, monthly revenue, estimated margin, completed trips, and invoice follow-up."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
