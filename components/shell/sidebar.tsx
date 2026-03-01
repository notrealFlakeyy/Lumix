import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/sales', key: 'nav.sales' },
  { href: '/purchases', key: 'nav.purchases' },
  { href: '/accounting', key: 'nav.accounting' },
  { href: '/reporting', key: 'nav.reporting' },
  { href: '/payroll', key: 'nav.payroll' },
  { href: '/inventory', key: 'nav.inventory' },
  { href: '/settings', key: 'nav.settings' },
] as const

export function Sidebar({ className }: { className?: string }) {
  const t = useTranslations()

  return (
    <aside className={cn('w-64 border-r border-border/60 bg-card/20 px-4 py-5', className)}>
      <div className="mb-6 text-sm font-semibold">{t('common.appName')}</div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

