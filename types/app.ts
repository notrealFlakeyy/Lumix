import type { TableRow } from '@/types/database'

export const companyRoles = ['owner', 'admin', 'dispatcher', 'accountant', 'driver', 'viewer'] as const
export type CompanyRole = (typeof companyRoles)[number]

export const appModules = ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings'] as const
export type AppModule = (typeof appModules)[number]

export const orderStatuses = ['draft', 'planned', 'assigned', 'in_progress', 'completed', 'invoiced', 'cancelled'] as const
export type OrderStatus = (typeof orderStatuses)[number]

export const tripStatuses = ['planned', 'started', 'completed', 'invoiced'] as const
export type TripStatus = (typeof tripStatuses)[number]

export const invoiceStatuses = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'] as const
export type InvoiceStatus = (typeof invoiceStatuses)[number]

export type Membership = TableRow<'company_users'> & {
  company: Pick<TableRow<'companies'>, 'id' | 'name' | 'timezone' | 'country'>
}

export type DashboardStats = {
  revenueThisMonth: number
  activeOrders: number
  completedTripsThisMonth: number
  overdueInvoices: number
}

export type RevenueBreakdown = {
  label: string
  value: number
  meta?: string | null
}

export type RecentOrder = {
  id: string
  orderNumber: string
  customerName: string
  pickupLocation: string
  deliveryLocation: string
  status: OrderStatus
  scheduledAt: string | null
}

export type RecentInvoice = {
  id: string
  invoiceNumber: string
  customerName: string
  total: number
  status: InvoiceStatus
  dueDate: string
}

export type SelectOption = {
  value: string
  label: string
  hint?: string | null
}
