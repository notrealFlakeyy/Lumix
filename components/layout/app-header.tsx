import { BellDot } from 'lucide-react'

import type { Membership } from '@/types/app'
import { LogoutButton } from '@/components/auth/logout-button'

export function AppHeader({ locale, membership, userEmail }: { locale: string; membership: Membership; userEmail?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/15 bg-[rgba(248,250,252,0.92)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Operations Hub</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{membership.company.name}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 md:flex">
            <BellDot className="h-4 w-4 text-sky-600" />
            <div>
              <div className="font-medium text-slate-900">{userEmail ?? 'Authenticated user'}</div>
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{membership.role}</div>
            </div>
          </div>
          <LogoutButton locale={locale} />
        </div>
      </div>
    </header>
  )
}
