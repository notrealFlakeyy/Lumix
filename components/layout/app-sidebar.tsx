'use client'

import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  CheckSquare2,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Receipt,
  ReceiptText,
  Route,
  Settings,
  Truck,
  UserSquare2,
  Users,
  Wrench,
} from 'lucide-react'

import type { AppModule } from '@/types/app'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  module: AppModule
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Transport',
    items: [
      { href: '/customers', label: 'Customers', module: 'customers', icon: Building2 },
      { href: '/vehicles', label: 'Fleet', module: 'vehicles', icon: Truck },
      { href: '/drivers', label: 'Drivers', module: 'drivers', icon: UserSquare2 },
      { href: '/orders', label: 'Orders', module: 'orders', icon: Route },
      { href: '/trips', label: 'Trips', module: 'trips', icon: Users },
      { href: '/maintenance', label: 'Maintenance', module: 'maintenance', icon: Wrench },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/invoices', label: 'Invoices', module: 'invoices', icon: FileText },
      { href: '/purchases', label: 'Purchases', module: 'purchases', icon: ClipboardList },
      { href: '/expenses', label: 'Expenses', module: 'expenses', icon: Receipt },
      { href: '/accounting', label: 'Accounting', module: 'accounting', icon: Calculator },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { href: '/inventory', label: 'Inventory', module: 'inventory', icon: Boxes },
      { href: '/time', label: 'Time', module: 'time', icon: Clock3 },
      { href: '/payroll', label: 'Payroll', module: 'payroll', icon: ReceiptText },
      { href: '/tasks', label: 'Tasks', module: 'tasks', icon: CheckSquare2 },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
      { href: '/settings', label: 'Settings', module: 'settings', icon: Settings },
    ],
  },
]

export function AppSidebar({ allowedModules }: { allowedModules: readonly AppModule[] }) {
  const pathname = usePathname()

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedModules.includes(item.module)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <aside
      className={cn('hidden w-60 shrink-0 xl:flex xl:flex-col')}
      style={{ borderRight: '1px solid rgba(var(--app-muted), 0.14)' }}
    >
      {/* Brand */}
      <div className="flex items-center px-5 py-5" style={{ borderBottom: '1px solid rgba(var(--app-muted), 0.12)' }}>
        <img src="/lumix-logo-transparent.png" alt="Lumix" className="h-16 w-16 shrink-0 object-contain" />
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <div
              className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'rgba(var(--app-muted), 0.6)' }}
            >
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                    )}
                    style={
                      isActive
                        ? {
                            background: 'rgba(var(--app-accent), 0.13)',
                            color: 'rgb(var(--app-contrast))',
                            boxShadow: '0 0 0 1px rgba(var(--app-accent), 0.20)',
                          }
                        : {
                            color: 'rgb(var(--app-muted))',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(var(--app-accent), 0.07)'
                        e.currentTarget.style.color = 'rgb(var(--app-contrast))'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgb(var(--app-muted))'
                      }
                    }}
                  >
                    {/* Icon chip */}
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-150"
                      style={
                        isActive
                          ? { background: 'rgba(var(--app-accent), 0.2)', color: 'rgb(var(--app-accent))' }
                          : { background: 'rgba(var(--app-muted), 0.1)', color: 'rgb(var(--app-muted))' }
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>

                    <span className="flex-1 leading-tight">{item.label}</span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <span
                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: 'rgb(var(--app-accent))' }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(var(--app-muted), 0.12)' }}>
        <p
          className="rounded-xl px-3 py-2.5 text-[11px] leading-snug"
          style={{ background: 'rgba(var(--app-accent), 0.07)', color: 'rgb(var(--app-muted))' }}
        >
          All office operations in one place — no other apps needed.
        </p>
      </div>
    </aside>
  )
}
