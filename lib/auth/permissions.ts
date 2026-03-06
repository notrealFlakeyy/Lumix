import type { AppModule, CompanyRole } from '@/types/app'

const moduleMatrix: Record<CompanyRole, AppModule[]> = {
  owner: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings'],
  admin: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings'],
  dispatcher: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'reports'],
  accountant: ['dashboard', 'invoices', 'reports'],
  driver: ['dashboard', 'trips'],
  viewer: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports'],
}

function normalizeRole(role: string | null | undefined): CompanyRole | null {
  if (!role) return null
  return Object.prototype.hasOwnProperty.call(moduleMatrix, role) ? (role as CompanyRole) : null
}

export function getAllowedModules(role: string | null | undefined): AppModule[] {
  const normalized = normalizeRole(role)
  if (!normalized) return ['dashboard']
  return moduleMatrix[normalized]
}

export function canAccessModule(role: string | null | undefined, module: AppModule) {
  return getAllowedModules(role).includes(module)
}

export function canManageOrders(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher'
}

export function canManageInvoices(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'accountant'
}

export function canViewReports(role: string | null | undefined) {
  return role !== null && role !== undefined && role !== 'driver'
}

export function canManageSettings(role: string | null | undefined) {
  return role === 'owner' || role === 'admin'
}

export function canEditMasterData(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher'
}
