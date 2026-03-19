import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calculator,
  CheckSquare2,
  Clock3,
  CreditCard,
  Receipt,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/marketing/scroll-reveal'

const modules = [
  {
    icon: Truck,
    label: 'Transport ERP',
    detail: 'Fleet, drivers, dispatch, trips, and invoicing in one flow.',
  },
  {
    icon: Boxes,
    label: 'Inventory',
    detail: 'Branch-aware stock, products, and warehouse operations.',
  },
  {
    icon: CreditCard,
    label: 'Finance',
    detail: 'Receivables, purchase bills, accounting-lite handoff.',
  },
  {
    icon: Clock3,
    label: 'Workforce',
    detail: 'Time tracking, payroll prep, and shift visibility.',
  },
  {
    icon: Receipt,
    label: 'Expenses',
    detail: 'Employee claims, receipt capture, and approvals.',
  },
  {
    icon: CheckSquare2,
    label: 'Tasks',
    detail: 'Internal kanban, compliance to-dos, and assignments.',
  },
  {
    icon: Wrench,
    label: 'Maintenance',
    detail: 'Fleet service scheduling, costs, and overdue alerts.',
  },
  {
    icon: BarChart3,
    label: 'Reports',
    detail: 'Revenue by customer, driver, and vehicle at a glance.',
  },
] as const

const proofPoints = [
  'One login for every department',
  'Mobile-first driver app',
  'Branch-aware permissions',
  'Invoice PDF generation',
  'Modular — enable only what you need',
  'Built on Supabase + Next.js 15',
] as const

export function LandingPage({ locale }: { locale: string }) {
  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'rgb(var(--app-bg))' }}
    >
      {/* ── Background layer ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Dot grid */}
        <div className="lumix-dot-bg lumix-bg-mask absolute inset-0 opacity-60" />

        {/* Drifting mesh blobs */}
        <div
          className="lumix-blob-a absolute left-[-12rem] top-[-8rem] h-[600px] w-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(244,127,90,0.55) 0%, transparent 70%)',
            filter: 'blur(72px)',
          }}
        />
        <div
          className="lumix-blob-b absolute right-[-10rem] top-[8rem] h-[500px] w-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(24,38,63,0.6) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="lumix-blob-c absolute bottom-[5rem] left-[35%] h-[380px] w-[380px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(167,209,188,0.8) 0%, transparent 70%)',
            filter: 'blur(64px)',
          }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background: 'rgba(var(--app-bg), 0.82)',
          borderColor: 'rgba(var(--app-muted), 0.14)',
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 lg:px-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: 'rgb(var(--app-contrast))' }}
            >
              <span style={{ color: 'rgb(var(--app-accent))' }}>L</span>
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: 'rgb(var(--app-contrast))' }}>
              Lumix
            </span>
            <span
              className="hidden rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] sm:block"
              style={{
                background: 'rgba(var(--app-accent), 0.1)',
                color: 'rgb(var(--app-accent))',
                border: '1px solid rgba(var(--app-accent), 0.22)',
              }}
            >
              ERP
            </span>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login" className="no-underline">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="lumix-cta-pulse">
              <Link href={`/${locale}/login`} className="no-underline">
                Open workspace
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-24 text-center lg:px-10 lg:pb-28 lg:pt-32">
        {/* Badge */}
        <div className="lumix-rise-1 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold lumix-shimmer-badge"
          style={{ borderColor: 'rgba(var(--app-muted), 0.2)', color: 'rgb(var(--app-muted))' }}
        >
          <Zap className="h-3.5 w-3.5" style={{ color: 'rgb(var(--app-accent))' }} />
          The only app your office team will ever need
        </div>

        {/* Headline */}
        <h1
          className="lumix-rise-2 mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl md:text-7xl"
          style={{ color: 'rgb(var(--app-contrast))' }}
        >
          One platform.
          <br />
          <span style={{ color: 'rgb(var(--app-accent))' }}>Every office operation.</span>
        </h1>

        {/* Sub */}
        <p
          className="lumix-rise-3 mx-auto mt-6 max-w-2xl text-lg leading-8"
          style={{ color: 'rgb(var(--app-muted))' }}
        >
          Lumix replaces the patchwork of spreadsheets, separate apps, and email chains with a single
          modular workspace — transport, finance, workforce, maintenance, and more.
        </p>

        {/* CTAs */}
        <div className="lumix-rise-4 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 no-underline">
              Launch workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/${locale}/login`} className="no-underline">
              See a demo
            </Link>
          </Button>
        </div>

        {/* Proof points strip */}
        <div
          className="lumix-rise-4 mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2"
        >
          {proofPoints.map((point) => (
            <span
              key={point}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: 'rgba(var(--app-muted), 0.8)' }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: 'rgb(var(--app-accent))' }}
              />
              {point}
            </span>
          ))}
        </div>
      </section>

      {/* ── Mock dashboard preview ────────────────────────── */}
      <ScrollReveal>
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-10">
          <div
            className="relative overflow-hidden rounded-[2rem] p-7 shadow-[0_40px_120px_rgba(24,38,63,0.14)]"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--app-contrast)) 0%, rgba(24,38,63,0.92) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Inner glow */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-64 w-96 opacity-20"
              style={{
                background: 'radial-gradient(circle at top right, rgb(var(--app-accent)), transparent 65%)',
              }}
            />

            {/* Top bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-white/20" />
                <div className="h-3 w-3 rounded-full bg-white/12" />
                <div className="h-3 w-3 rounded-full bg-white/8" />
              </div>
              <div
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ background: 'rgba(var(--app-accent), 0.2)', color: 'rgb(var(--app-accent))' }}
              >
                Live
              </div>
            </div>

            {/* Stats row */}
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Active trips', value: '24' },
                { label: 'Open invoices', value: '€38 400' },
                { label: 'Pending tasks', value: '7' },
                { label: 'Fleet status', value: '12 / 14' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">{stat.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Module row */}
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {['Transport', 'Expenses', 'Maintenance', 'Reports'].map((mod, i) => (
                <div
                  key={mod}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="text-sm text-white/75">{mod}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: i % 3 === 1 ? 'rgba(167,209,188,0.9)' : 'rgb(var(--app-accent))' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Module grid ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-24 lg:px-10">
        <ScrollReveal>
          <div className="mb-12 text-center">
            <div
              className="mb-3 text-xs font-semibold uppercase tracking-[0.24em]"
              style={{ color: 'rgb(var(--app-accent))' }}
            >
              Modular by design
            </div>
            <h2
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: 'rgb(var(--app-contrast))' }}
            >
              Enable only what you need.
              <br />
              Add the rest when you grow.
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((mod, i) => {
            const Icon = mod.icon
            return (
              <ScrollReveal key={mod.label} delay={i * 50}>
                <div
                  className="lumix-module-card rounded-2xl p-5"
                >
                  <div
                    className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      background: 'rgba(var(--app-accent), 0.1)',
                      color: 'rgb(var(--app-accent))',
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div
                    className="mb-1.5 text-sm font-semibold"
                    style={{ color: 'rgb(var(--app-contrast))' }}
                  >
                    {mod.label}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--app-muted))' }}>
                    {mod.detail}
                  </p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────── */}
      <ScrollReveal>
        <section className="mx-auto max-w-6xl px-5 pb-24 lg:px-10">
          <div
            className="relative overflow-hidden rounded-[2rem] px-10 py-14 text-center"
            style={{
              background: 'rgb(var(--app-contrast))',
              boxShadow: '0 32px 80px rgba(24,38,63,0.18)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(rgba(244,127,90,0.12) 1px, transparent 1px)',
                backgroundSize: '26px 26px',
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 opacity-30"
              style={{
                background: 'radial-gradient(circle at top, rgb(var(--app-accent)), transparent 65%)',
              }}
            />
            <div className="relative">
              <h2
                className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              >
                Ready to run your whole office from one place?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'rgba(255,255,255,0.62)' }}>
                No setup fees, no per-module pricing. Enable what you need, when you need it.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-white hover:bg-white/92"
                  style={{ color: 'rgb(var(--app-contrast))' }}
                >
                  <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 no-underline">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{
          borderColor: 'rgba(var(--app-muted), 0.12)',
          color: 'rgba(var(--app-muted), 0.6)',
        }}
      >
        © {new Date().getFullYear()} Lumix — modular operations platform
      </footer>
    </main>
  )
}
