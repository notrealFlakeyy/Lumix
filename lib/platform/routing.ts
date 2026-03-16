import type { AppModule, PlatformModuleKey } from '@/types/app'

import { getAllowedModules } from '@/lib/auth/permissions'

const directRouteModuleMap: Record<string, AppModule> = {
  dashboard: 'dashboard',
  customers: 'customers',
  vehicles: 'vehicles',
  drivers: 'drivers',
  orders: 'orders',
  trips: 'trips',
  invoices: 'invoices',
  reports: 'reports',
  settings: 'settings',
  inventory: 'inventory',
  purchases: 'purchases',
  time: 'time',
  payroll: 'payroll',
  accounting: 'accounting',
}

const compatibilityRouteModuleMap: Record<string, AppModule> = {
  reporting: 'reports',
  sales: 'orders',
  driver: 'trips',
}

export function getAppModuleForRouteSegment(segment: string | undefined): AppModule | null {
  if (!segment) {
    return null
  }

  return directRouteModuleMap[segment] ?? compatibilityRouteModuleMap[segment] ?? null
}

export function isProtectedRouteSegment(segment: string | undefined) {
  return Boolean(getAppModuleForRouteSegment(segment))
}

export function getDefaultAuthenticatedHref(
  locale: string,
  role: string | null | undefined,
  enabledModules: readonly PlatformModuleKey[],
) {
  if (role === 'driver' && enabledModules.includes('transport')) {
    return `/${locale}/driver`
  }

  const fallbackModule = getAllowedModules(role, enabledModules)[0] ?? 'dashboard'
  return `/${locale}/${fallbackModule}`
}
