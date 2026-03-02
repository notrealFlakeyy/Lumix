export const allModules = [
  'dashboard',
  'sales',
  'purchases',
  'accounting',
  'reporting',
  'payroll',
  'inventory',
  'settings',
  'time',
] as const

export type AppModule = (typeof allModules)[number]

export function computeAllowedModules(role: string | null, allowedModules: unknown): AppModule[] {
  if (role === 'employee') return ['time']

  const raw = Array.isArray(allowedModules) ? allowedModules : []
  const normalized = raw
    .map((v) => String(v).trim())
    .filter((v): v is AppModule => (allModules as readonly string[]).includes(v))

  if (normalized.length > 0) return Array.from(new Set(normalized))
  return [...allModules]
}

export function defaultModuleFor(allowed: readonly AppModule[]) {
  if (allowed.includes('dashboard')) return 'dashboard'
  return allowed[0] ?? 'dashboard'
}

