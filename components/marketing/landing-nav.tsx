'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, BookOpen, LifeBuoy, Info, Truck, FileText, Clock, BarChart3, Boxes } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem =
  | { label: string; href: string; submenu?: false }
  | {
      label: string
      submenu: true
      type: 'description' | 'simple' | 'icon'
      items: Array<{
        href: string
        label: string
        description?: string
        icon?: React.ReactNode
      }>
    }

const navigationLinks: NavItem[] = [
  {
    label: 'Features',
    submenu: true,
    type: 'description',
    items: [
      { href: '#modules', label: 'Dispatch & Orders', description: 'Manage orders, assign drivers, and track deliveries in real time.' },
      { href: '#modules', label: 'Fleet Management', description: 'Track vehicles, maintenance schedules, and fuel costs.' },
      { href: '#modules', label: 'Invoicing & Finance', description: 'Generate invoices, track payments, and manage expenses.' },
      { href: '#modules', label: 'Driver Workflows', description: 'Mobile app for drivers — trips, proof of delivery, and time tracking.' },
    ],
  },
  {
    label: 'Modules',
    submenu: true,
    type: 'icon',
    items: [
      { href: '#modules', label: 'Transport', icon: <Truck size={15} /> },
      { href: '#modules', label: 'Documents', icon: <FileText size={15} /> },
      { href: '#modules', label: 'Time Tracking', icon: <Clock size={15} /> },
      { href: '#modules', label: 'Reports', icon: <BarChart3 size={15} /> },
      { href: '#modules', label: 'Inventory', icon: <Boxes size={15} /> },
    ],
  },
  {
    label: 'Pricing',
    submenu: true,
    type: 'simple',
    items: [
      { href: '/plans', label: 'Starter — €49/mo' },
      { href: '/plans', label: 'Growth — €149/mo' },
      { href: '/plans', label: 'Enterprise — Custom' },
    ],
  },
  {
    label: 'About',
    submenu: true,
    type: 'icon',
    items: [
      { href: '#', label: 'Documentation', icon: <BookOpen size={15} /> },
      { href: '#', label: 'Support', icon: <LifeBuoy size={15} /> },
      { href: '#', label: 'About Us', icon: <Info size={15} /> },
    ],
  },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        background: 'rgba(var(--app-bg), 0.82)',
        borderColor: 'rgba(var(--app-muted), 0.14)',
      }}
    >
      <div className="mx-auto max-w-6xl px-5 lg:px-10" ref={navRef}>
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Left: hamburger + logo + desktop nav ── */}
          <div className="flex items-center gap-3">

            {/* Mobile hamburger */}
            <button
              className="group flex h-8 w-8 items-center justify-center rounded-md md:hidden"
              style={{ color: 'rgb(var(--app-contrast))' }}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg
                width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M4 12L20 12" className={cn(
                  'origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)]',
                  mobileOpen ? 'translate-y-0 rotate-[315deg]' : '-translate-y-[7px]'
                )} />
                <path d="M4 12H20" className={cn(
                  'origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)]',
                  mobileOpen ? 'rotate-45' : ''
                )} />
                <path d="M4 12H20" className={cn(
                  'origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)]',
                  mobileOpen ? 'translate-y-0 rotate-[135deg]' : 'translate-y-[7px]'
                )} />
              </svg>
            </button>

            {/* Logo */}
            <Link href="/" className="no-underline">
              <img src="/lumix-logo-transparent.png" alt="Lumix" className="h-16 w-16 object-contain" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {navigationLinks.map((link) => (
                <div key={link.label} className="relative">
                  {link.submenu ? (
                    <>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === link.label ? null : link.label)}
                        className={cn(
                          'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                          activeDropdown === link.label
                            ? 'text-[rgb(var(--app-contrast))]'
                            : 'text-[rgb(var(--app-muted))] hover:text-[rgb(var(--app-contrast))]'
                        )}
                      >
                        {link.label}
                        <ChevronDown
                          size={13}
                          className={cn('transition-transform duration-200', activeDropdown === link.label && 'rotate-180')}
                        />
                      </button>

                      {activeDropdown === link.label && (
                        <div
                          className="absolute left-0 top-full mt-2 overflow-hidden rounded-xl border shadow-xl"
                          style={{
                            background: 'rgb(var(--app-surface, 255 255 255))',
                            borderColor: 'rgba(var(--app-muted), 0.15)',
                            minWidth: link.type === 'description' ? '340px' : '220px',
                          }}
                        >
                          <div className={cn(
                            'grid gap-1 p-2',
                            link.type === 'description' && link.items.length > 2 ? 'grid-cols-2' : 'grid-cols-1'
                          )}>
                            {link.items.map((item) => (
                              <Link
                                key={item.label}
                                href={item.href as any}
                                className="group flex select-none items-start gap-2.5 rounded-lg p-3 no-underline outline-none transition-colors hover:bg-[rgba(var(--app-accent),0.07)]"
                                onClick={() => setActiveDropdown(null)}
                              >
                                {(link.type === 'icon' || link.type === 'simple') && item.icon && (
                                  <span
                                    className="mt-0.5 shrink-0 opacity-60"
                                    style={{ color: 'rgb(var(--app-accent))' }}
                                  >
                                    {item.icon}
                                  </span>
                                )}
                                <div>
                                  <div className="text-sm font-medium leading-none" style={{ color: 'rgb(var(--app-contrast))' }}>
                                    {item.label}
                                  </div>
                                  {item.description && (
                                    <p className="mt-1 text-xs leading-snug" style={{ color: 'rgba(var(--app-muted), 0.8)' }}>
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={(link as { href: string }).href as any}
                      className="rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors"
                      style={{ color: 'rgb(var(--app-muted))' }}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* ── Right: CTA buttons ── */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-sm">
              <Link href="/login" className="no-underline">Sign in</Link>
            </Button>
            <Button
              asChild size="sm"
              className="lumix-cta-pulse text-sm"
              style={{ background: 'rgb(var(--app-accent))', color: '#fff' } as React.CSSProperties}
            >
              <Link href="/signup" className="no-underline">Get started</Link>
            </Button>
          </div>
        </div>

        {/* ── Mobile menu panel ── */}
        {mobileOpen && (
          <div
            className="border-t pb-4 pt-3 md:hidden"
            style={{ borderColor: 'rgba(var(--app-muted), 0.12)' }}
          >
            {navigationLinks.map((link, idx) => (
              <div key={link.label}>
                {link.submenu ? (
                  <div className="mb-2">
                    <div
                      className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: 'rgba(var(--app-muted), 0.5)' }}
                    >
                      {link.label}
                    </div>
                    {link.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href as any}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors hover:bg-[rgba(var(--app-accent),0.07)]"
                        style={{ color: 'rgb(var(--app-contrast))' }}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.icon && (
                          <span className="opacity-50" style={{ color: 'rgb(var(--app-accent))' }}>
                            {item.icon}
                          </span>
                        )}
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={(link as { href: string }).href as any}
                    className="flex items-center rounded-lg px-3 py-2 text-sm font-medium no-underline"
                    style={{ color: 'rgb(var(--app-contrast))' }}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )}
                {idx < navigationLinks.length - 1 && (
                  <div className="my-1 h-px" style={{ background: 'rgba(var(--app-muted), 0.1)' }} />
                )}
              </div>
            ))}
            <div className="mt-3 flex gap-2 px-3">
              <Button asChild variant="outline" size="sm" className="flex-1 text-sm">
                <Link href="/login" className="no-underline" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </Button>
              <Button
                asChild size="sm" className="flex-1 text-sm"
                style={{ background: 'rgb(var(--app-accent))', color: '#fff' } as React.CSSProperties}
              >
                <Link href="/signup" className="no-underline" onClick={() => setMobileOpen(false)}>Get started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
