import type { AppModule, PlatformModuleKey } from '@/types/app'

export const defaultEnabledPlatformModules: PlatformModuleKey[] = ['core', 'transport']

export const platformModuleDefinitions: Array<{
  key: PlatformModuleKey
  label: string
  description: string
  routeModules: readonly AppModule[]
  alwaysEnabled?: boolean
}> = [
  {
    key: 'core',
    label: 'Core Platform',
    description: 'Dashboard, reporting, settings, auth, documents, billing, and the shared operating foundation.',
    routeModules: ['dashboard', 'reports', 'settings'],
    alwaysEnabled: true,
  },
  {
    key: 'transport',
    label: 'Transport ERP',
    description: 'Customers, vehicles, drivers, dispatch, trips, and invoicing for transportation businesses.',
    routeModules: ['customers', 'vehicles', 'drivers', 'orders', 'trips', 'invoices'],
  },
  {
    key: 'inventory',
    label: 'Warehouse & Inventory',
    description: 'Branch-aware stock, products, bin locations, and warehouse operations for mixed transport or logistics clients.',
    routeModules: ['inventory'],
  },
  {
    key: 'purchases',
    label: 'Purchasing',
    description: 'Supplier, purchase order, and inbound stock workflows for clients that also run procurement through the platform.',
    routeModules: ['purchases'],
  },
  {
    key: 'time',
    label: 'Time Tracking',
    description: 'Branch or depot level time capture for operational staff, drivers, and workshop teams.',
    routeModules: ['time'],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    description: 'Payroll preparation, compensation exports, and employee cost review once time tracking is enabled.',
    routeModules: ['payroll'],
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: 'Accounting-lite workflows, reconciliation, and finance handoff for customers that need more than invoicing.',
    routeModules: ['accounting'],
  },
]

export const onboardingModuleBundles = [
  {
    key: 'transport',
    label: 'Transport ERP',
    description: 'Dispatch, trips, invoicing, customers, fleet, and the driver workflow for transportation businesses.',
    enabledModules: ['core', 'transport'] as PlatformModuleKey[],
  },
  {
    key: 'warehouse',
    label: 'Warehouse & Inventory',
    description: 'Stock, purchasing, and warehouse operations for clients that do not need the transport suite yet.',
    enabledModules: ['core', 'inventory', 'purchases'] as PlatformModuleKey[],
  },
  {
    key: 'hybrid',
    label: 'Transport + Warehouse',
    description: 'Combined transport and warehouse operations for mixed logistics businesses.',
    enabledModules: ['core', 'transport', 'inventory', 'purchases'] as PlatformModuleKey[],
  },
  {
    key: 'operations',
    label: 'Operations + Workforce',
    description: 'Shared platform, workforce time, payroll preparation, and accounting-lite without forcing dispatch workflows.',
    enabledModules: ['core', 'time', 'payroll', 'accounting'] as PlatformModuleKey[],
  },
] as const

export type OnboardingModuleBundleKey = (typeof onboardingModuleBundles)[number]['key']

export function getOnboardingBundleModules(bundleKey: string | null | undefined) {
  return onboardingModuleBundles.find((bundle) => bundle.key === bundleKey)?.enabledModules ?? defaultEnabledPlatformModules
}

const platformModuleDefinitionMap = new Map(platformModuleDefinitions.map((definition) => [definition.key, definition]))

export function isPlatformModuleKey(value: string | null | undefined): value is PlatformModuleKey {
  return Boolean(value && platformModuleDefinitionMap.has(value as PlatformModuleKey))
}

export function normalizeEnabledPlatformModules(values: readonly string[] | null | undefined) {
  const normalized = (values ?? []).filter(isPlatformModuleKey) as PlatformModuleKey[]
  const deduped = [...new Set(normalized)]

  if (!deduped.includes('core')) {
    deduped.unshift('core')
  }

  return deduped.length > 0 ? deduped : [...defaultEnabledPlatformModules]
}

export function getEnabledAppModules(enabledPlatformModules: readonly PlatformModuleKey[]) {
  const enabled = normalizeEnabledPlatformModules(enabledPlatformModules)

  return [...new Set(enabled.flatMap((moduleKey) => platformModuleDefinitionMap.get(moduleKey)?.routeModules ?? []))]
}
