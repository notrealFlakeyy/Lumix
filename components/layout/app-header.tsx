import { BellDot } from 'lucide-react'

import type { Membership } from '@/types/app'
import { platformModuleDefinitions } from '@/lib/platform/modules'
import { Link } from '@/i18n/navigation'
import { CompanySwitcher } from '@/components/auth/company-switcher'
import { LogoutButton } from '@/components/auth/logout-button'
import { GlobalSearch } from '@/components/layout/global-search'
import { Button } from '@/components/ui/button'
import { canUseDriverWorkflow } from '@/lib/auth/permissions'

export function AppHeader({
  locale,
  membership,
  memberships,
  userEmail,
}: {
  locale: string
  membership: Membership
  memberships: Membership[]
  userEmail?: string | null
}) {
  const enabledModuleLabels = platformModuleDefinitions
    .filter((definition) => membership.enabledModules.includes(definition.key))
    .map((definition) => definition.label)

  return (
    <header className="sticky top-0 z-20 border-b border-border/20 bg-[rgba(248,239,227,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--app-muted))]">Operations Hub</div>
          <div className="mt-1 text-sm font-semibold text-[rgb(var(--app-contrast))]">{membership.company.name}</div>
          <div className="mt-1 text-xs text-[rgb(var(--app-muted))]">{enabledModuleLabels.join(' | ')}</div>
        </div>
        <div className="flex items-center gap-3">
          <CompanySwitcher locale={locale} memberships={memberships} currentCompanyId={membership.company_id} redirectTo={`/${locale}/dashboard`} />
          <GlobalSearch locale={locale} />
          <div className="hidden items-center gap-3 rounded-full border border-border/25 bg-[rgba(255,249,241,0.88)] px-4 py-2 text-sm text-[rgb(var(--app-muted))] md:flex">
            <BellDot className="h-4 w-4 text-[rgb(var(--app-accent))]" />
            <div>
              <div className="font-medium text-[rgb(var(--app-contrast))]">{userEmail ?? 'Authenticated user'}</div>
              <div className="text-xs uppercase tracking-[0.16em] text-[rgb(var(--app-muted))]">{membership.role}</div>
            </div>
          </div>
          {canUseDriverWorkflow(membership.role) && membership.enabledModules.includes('transport') ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/driver">Driver View</Link>
            </Button>
          ) : null}
          <LogoutButton locale={locale} />
        </div>
      </div>
    </header>
  )
}
