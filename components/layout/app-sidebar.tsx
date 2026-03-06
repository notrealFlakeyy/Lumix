'use client'

import { BarChart3, Building2, FileText, LayoutDashboard, Route, Settings, Truck, UserSquare2, Users } from 'lucide-react'

import type { AppModule } from '@/types/app'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const navItems: Array<{ href: string; label: string; module: AppModule; icon: React.ComponentType<{ className?: string }> }> = [
  { href: '/dashboard', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', module: 'customers', icon: Building2 },
  { href: '/vehicles', label: 'Vehicles', module: 'vehicles', icon: Truck },
  { href: '/drivers', label: 'Drivers', module: 'drivers', icon: UserSquare2 },
  { href: '/orders', label: 'Orders', module: 'orders', icon: Route },
  { href: '/trips', label: 'Trips', module: 'trips', icon: Users },
  { href: '/invoices', label: 'Invoices', module: 'invoices', icon: FileText },
  { href: '/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', module: 'settings', icon: Settings },
]

export function AppSidebar({ allowedModules }: { allowedModules: readonly AppModule[] }) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-72 shrink-0 border-r border-border/20 bg-white/80 px-5 py-6 xl:block">
      <div className="rounded-2xl border border-slate-200/80 bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.7)]">
        <div className="text-xs uppercase tracking-[0.24em] text-sky-200/80">Lumix</div>
        <div className="mt-2 text-lg font-semibold tracking-tight">Transport ERP</div>
        <p className="mt-2 text-sm text-slate-300">Dispatch, trips, invoicing, and reporting in one workspace.</p>
      </div>

      <nav className="mt-8 space-y-1.5">
        {navItems
          .filter((item) => allowedModules.includes(item.module))
          .map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-slate-950 text-white shadow-softSm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
      </nav>
    </aside>
  )
}
