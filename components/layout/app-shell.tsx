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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] text-slate-950">
      <div className="flex min-h-screen">
        <AppSidebar allowedModules={allowedModules} />
        <div className="min-w-0 flex-1">
          <AppHeader locale={locale} membership={membership} memberships={memberships} userEmail={userEmail} />
          <main className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
