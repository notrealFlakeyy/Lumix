import type { AppModule, CompanyRole, PlatformModuleKey } from '@/types/app'

import { defaultEnabledPlatformModules, getEnabledAppModules } from '@/lib/platform/modules'

const moduleMatrix: Record<CompanyRole, AppModule[]> = {
  owner: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings', 'inventory', 'purchases', 'time', 'payroll', 'accounting'],
  admin: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'settings', 'inventory', 'purchases', 'time', 'payroll', 'accounting'],
  dispatcher: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'reports', 'inventory', 'purchases', 'time'],
  accountant: ['dashboard', 'invoices', 'reports', 'purchases', 'accounting', 'payroll'],
  driver: ['dashboard', 'trips', 'time'],
  viewer: ['dashboard', 'customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices', 'reports', 'inventory', 'purchases', 'time', 'payroll', 'accounting'],
}

function normalizeRole(role: string | null | undefined): CompanyRole | null {
  if (!role) return null
  return Object.prototype.hasOwnProperty.call(moduleMatrix, role) ? (role as CompanyRole) : null
}

export function getAllowedModules(role: string | null | undefined, enabledPlatformModules: readonly PlatformModuleKey[] = defaultEnabledPlatformModules): AppModule[] {
  const normalized = normalizeRole(role)
  if (!normalized) return ['dashboard']
  const enabledAppModules = getEnabledAppModules(enabledPlatformModules)
  return moduleMatrix[normalized].filter((module) => enabledAppModules.includes(module))
}

export function canAccessModule(role: string | null | undefined, module: AppModule, enabledPlatformModules: readonly PlatformModuleKey[] = defaultEnabledPlatformModules) {
  return getAllowedModules(role, enabledPlatformModules).includes(module)
}

export function canManageOrders(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher'
}

export function canManageInvoices(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'accountant'
}

export function canManageTripExecution(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher' || role === 'driver'
}

export function canUseDriverWorkflow(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher' || role === 'driver'
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

export function canManageInventory(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher'
}

export function canManagePurchases(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher' || role === 'accountant'
}

export function canManageTime(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'dispatcher'
}

export function canManagePayroll(role: string | null | undefined) {
  return role === 'owner' || role === 'admin' || role === 'accountant'
}
