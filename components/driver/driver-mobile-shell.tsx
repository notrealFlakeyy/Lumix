import { ArrowLeft } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import type { Membership } from '@/types/app'

import { CompanySwitcher } from '@/components/auth/company-switcher'
import { LogoutButton } from '@/components/auth/logout-button'
import { DriverBottomNav } from '@/components/driver/driver-bottom-nav'
import { DriverOfflineSync } from '@/components/driver/offline-sync'
import { Button } from '@/components/ui/button'

export function DriverMobileShell({
  locale,
  membership,
  memberships,
  userEmail,
  children,
}: {
  locale: string
  membership: Membership
  memberships: Membership[]
  userEmail?: string | null
  children: React.ReactNode
}) {
  const showBackToApp = membership.role !== 'driver'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#e8eef5_100%)] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[rgba(248,250,252,0.94)] backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Driver Mobile</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{membership.company.name}</div>
              <div className="text-xs text-slate-500">{userEmail ?? 'Authenticated user'} | {membership.role}</div>
            </div>
            <LogoutButton locale={locale} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showBackToApp ? (
              <Button asChild variant="outline" size="sm" className="rounded-full border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to ERP</span>
                </Link>
              </Button>
            ) : null}
            <CompanySwitcher locale={locale} memberships={memberships} currentCompanyId={membership.company_id} redirectTo={`/${locale}/driver`} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 pb-24 pt-5">
        <DriverOfflineSync />
        {children}
      </div>
      <DriverBottomNav enabledModules={membership.enabledModules} />
    </div>
  )
}
