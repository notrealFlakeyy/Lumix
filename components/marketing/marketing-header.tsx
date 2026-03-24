import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { marketingNavLinks } from '@/components/marketing/content'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(34,28,21,0.08)] bg-[rgba(253,246,238,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-flex w-fit shrink-0 items-center no-underline">
            <Image
              src="/lumix-logo-transparent.png"
              alt="Lumix"
              width={220}
              height={68}
              className="h-8 w-auto sm:h-9 lg:h-10 xl:h-11"
              priority
            />
          </Link>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <nav className="flex flex-wrap items-center gap-2 text-sm md:gap-3">
              {marketingNavLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 text-[rgb(var(--app-contrast))] no-underline transition hover:bg-white/70"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild variant="ghost" size="sm" className="rounded-full text-[rgb(var(--app-contrast))]">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-[rgb(var(--app-accent))] text-[rgb(var(--app-contrast))] shadow-[0_18px_32px_rgba(234,108,63,0.24)] hover:bg-[rgb(var(--app-accent))]/90 sm:min-w-[11rem]"
              >
                <Link href="/login" className="inline-flex items-center gap-2 no-underline">
                  Open workspace <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
