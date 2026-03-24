import { ArrowRight, MenuSquare } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { marketingNavLinks } from '@/components/marketing/content'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-[rgba(248,239,227,0.76)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--app-contrast))] text-white shadow-[0_16px_36px_rgba(63,45,31,0.18)]">
              <MenuSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Lumix</div>
              <div className="mt-1 text-sm font-semibold text-[rgb(var(--app-contrast))]">Transport systems, workflow design, and operational rollout support</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="sm:min-w-[11rem]">
              <Link href="/login" className="inline-flex items-center gap-2 no-underline">
                Open workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          {marketingNavLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/65 bg-white/72 px-4 py-2 text-sm font-medium text-[rgb(var(--app-contrast))] no-underline shadow-[0_10px_22px_rgba(95,73,52,0.08)] transition hover:-translate-y-[1px] hover:border-white hover:bg-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
