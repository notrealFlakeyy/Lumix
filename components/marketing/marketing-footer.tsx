import { Link } from '@/i18n/navigation'
import { marketingNavLinks } from '@/components/marketing/content'

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/50 bg-[rgba(255,249,241,0.72)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Lumix</div>
          <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--app-muted))]">
            A transport-first operating platform for dispatch, drivers, finance follow-through, and the office workflows that
            usually fall between systems.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[rgb(var(--app-contrast))]">Explore</div>
            <div className="flex flex-col gap-2">
              {marketingNavLinks.map((item) => (
                <Link key={item.href} href={item.href} className="text-sm text-[rgb(var(--app-muted))]">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[rgb(var(--app-contrast))]">Workspace</div>
            <div className="flex flex-col gap-2">
              <Link href="/login" className="text-sm text-[rgb(var(--app-muted))]">
                Sign in
              </Link>
              <Link href="/signup" className="text-sm text-[rgb(var(--app-muted))]">
                Start onboarding
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

