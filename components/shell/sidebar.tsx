import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import type { AppModule } from '@/lib/auth/member-access'

const navItems = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/time', key: 'nav.time' },
  { href: '/sales', key: 'nav.sales' },
  { href: '/purchases', key: 'nav.purchases' },
  { href: '/accounting', key: 'nav.accounting' },
  { href: '/reporting', key: 'nav.reporting' },
  { href: '/payroll', key: 'nav.payroll' },
  { href: '/inventory', key: 'nav.inventory' },
  { href: '/settings', key: 'nav.settings' },
] as const

export function Sidebar({ className, allowedModules }: { className?: string; allowedModules?: readonly AppModule[] }) {
  const t = useTranslations()

  const visibleItems = allowedModules
    ? navItems.filter((item) => allowedModules.includes(item.href.replace('/', '') as AppModule))
    : navItems

  return (
    <aside className={cn('w-72 border-r border-border/25 bg-background px-5 py-7', className)}>
      <div className="mb-8 text-sm font-semibold tracking-tight text-foreground">{t('common.appName')}</div>
      <nav className="space-y-1.5">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
