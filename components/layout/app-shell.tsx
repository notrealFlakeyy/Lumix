import type { AppModule, Membership } from '@/types/app'

import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'

export function AppShell({
  locale,
  membership,
  memberships,
  allowedModules,
  userEmail,
  children,
}: {
  locale: string
  membership: Membership
  memberships: Membership[]
  allowedModules: readonly AppModule[]
  userEmail?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-app-ambient" style={{ background: 'rgb(var(--app-bg))' }}>
      <div className="flex min-h-screen">
        <AppSidebar allowedModules={allowedModules} />
        <div className="min-w-0 flex-1 flex flex-col">
          <AppHeader locale={locale} membership={membership} memberships={memberships} userEmail={userEmail} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
