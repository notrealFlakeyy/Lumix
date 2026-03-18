import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  CreditCard,
  FileStack,
  MapPinned,
  ScanSearch,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollReveal } from '@/components/marketing/scroll-reveal'

const workflowSteps = [
  {
    title: 'Dispatch and trip control',
    detail: 'Live routes, driver actions, proof capture, and document visibility in one operational loop.',
    icon: Truck,
  },
  {
    title: 'Office follow-through',
    detail: 'Quotes, invoices, recurring work, CSV import, search, alerts, and approvals keep operations moving.',
    icon: FileStack,
  },
  {
    title: 'Modular scale-up',
    detail: 'Time, payroll prep, finance workflows, and branch-aware permissions can be enabled as the customer grows.',
    icon: Boxes,
  },
] as const

const modules = [
  { label: 'Transport ERP', detail: 'Dispatch, trips, fleet, driver workflows, invoicing, and proof of delivery.', icon: Truck },
  { label: 'Workforce', detail: 'Clock in/out, approvals, payroll prep, and mobile-first shift visibility.', icon: Clock3 },
  { label: 'Finance', detail: 'Receivables, invoice PDFs, payment registration, and accounting-ready handoff.', icon: CreditCard },
  { label: 'Intelligence', detail: 'Global search, alerts, recurring work, imports, and branch-aware reporting.', icon: ChartNoAxesCombined },
] as const

const productSignals = [
  'Driver mobile workflows',
  'Branch-ready permissions',
  'Search across entities',
  'Invoice generation from trips',
  'Recurring order templates',
  'CSV import and validation',
] as const

export function LandingPage({ locale }: { locale: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8efe3_0%,#f3e4d2_45%,#efe6da_100%)] text-[rgb(var(--app-fg))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="lumix-orb left-[-8rem] top-[-4rem] h-72 w-72 bg-[rgba(244,127,90,0.16)]" />
        <div className="lumix-orb right-[-4rem] top-24 h-80 w-80 bg-[rgba(24,38,63,0.12)]" />
        <div className="lumix-orb bottom-12 left-1/3 h-64 w-64 bg-[rgba(167,209,188,0.2)]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/40 bg-[rgba(248,239,227,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5 lg:px-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Lumix</div>
            <div className="mt-1 max-w-xs text-sm font-semibold text-[rgb(var(--app-contrast))] sm:max-w-none">Operations platform for modern transport teams</div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Open workspace</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-16 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <ScrollReveal className="space-y-7">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm text-[rgb(var(--app-contrast))] shadow-[0_14px_32px_rgba(95,73,52,0.08)] backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-[rgb(var(--app-accent))]" />
              <span className="truncate">Built for real transport office work, not just dispatch demos</span>
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[rgb(var(--app-contrast))] sm:text-5xl md:text-7xl">
                One calm control layer for dispatch, office ops, and driver follow-through.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[rgb(var(--app-muted))] sm:text-lg sm:leading-8 md:text-xl">
                Lumix gives transport companies a more premium operating rhythm: mobile driver actions, recurring office
                workflows, finance follow-through, and modular rollout paths in one tenant-aware system.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="pr-6">
                <Link href="/login" className="inline-flex items-center gap-2 no-underline">
                  Launch the workspace <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/70">
                <Link href={`/${locale}/login`} className="no-underline">
                  Explore the platform
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-[rgba(255,249,241,0.82)]">
                <CardContent className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--app-muted))]">Driver app</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Mobile-first</div>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--app-muted))]">Trips, time, checkpoints, and delivery proof with a premium UI direction.</p>
                </CardContent>
              </Card>
              <Card className="bg-[rgba(255,249,241,0.82)]">
                <CardContent className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--app-muted))]">Office layer</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Modular</div>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--app-muted))]">Enable sales, time, accounting, or warehouse surfaces only when the customer needs them.</p>
                </CardContent>
              </Card>
              <Card className="bg-[rgba(255,249,241,0.82)]">
                <CardContent className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--app-muted))]">Operations</div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Branch-ready</div>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--app-muted))]">Permissions, search, alerts, and reporting scale from one office to multi-branch workflows.</p>
                </CardContent>
              </Card>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={140} className="relative">
            <div className="lumix-dashboard-shell">
              <div className="lumix-dashboard-card text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">Operations pulse</div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">A workspace that feels coordinated, not crowded.</h2>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Live</div>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
                    <div className="text-sm text-white">Urgent queue</div>
                    <div className="mt-2 text-4xl font-semibold text-white">12</div>
                    <div className="mt-3 text-sm leading-6 text-white">Overdue invoices, maintenance reminders, and proof follow-through in one panel.</div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[rgba(244,127,90,0.16)] p-5">
                    <div className="text-sm text-white">Driver mobile</div>
                    <div className="mt-2 text-4xl font-semibold text-white">Ready</div>
                    <div className="mt-3 text-sm leading-6 text-white">Trip control, checkpoints, proof of delivery, and time actions from the phone.</div>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {productSignals.map((signal) => (
                    <div key={signal} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/82">
                      <span>{signal}</span>
                      <ChevronRight className="h-4 w-4 text-white/55" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lumix-floating-metric right-6 top-[-1rem]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[rgb(var(--app-muted))]">Office + Mobile</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">One flow</div>
              </div>
              <div className="lumix-floating-metric bottom-10 left-[-1.5rem] bg-[rgba(167,209,188,0.92)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[rgba(24,38,63,0.6)]">Driver focus</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Native-ready</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <ScrollReveal className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Workflow</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))] md:text-4xl">
              From dispatch to delivery proof, the product stays in one visual language.
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <ScrollReveal className="lg:sticky lg:top-28 lg:h-fit">
            <Card className="overflow-hidden bg-[rgba(24,38,63,0.96)] text-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Interactive operations board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/8 p-5">
                    <MapPinned className="h-5 w-5 text-[rgb(var(--app-accent))]" />
                    <div className="mt-3 text-xl font-semibold">Route control</div>
                    <div className="mt-2 text-sm leading-6 text-white/72">Trip status, location checkpoints, and delivery state stay visible in one lane.</div>
                  </div>
                  <div className="rounded-3xl bg-white/8 p-5">
                    <ScanSearch className="h-5 w-5 text-[rgb(var(--app-accent-2))]" />
                    <div className="mt-3 text-xl font-semibold">Search layer</div>
                    <div className="mt-2 text-sm leading-6 text-white/72">Jump across quotes, invoices, customers, and operations records without context switching.</div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
                  <div className="text-sm uppercase tracking-[0.2em] text-white/58">Why it feels better</div>
                  <p className="mt-3 text-sm leading-7 text-white/78">
                    The interface is designed to feel more like a guided product surface than an admin spreadsheet: calmer cards,
                    clearer priority, and mobile interactions that match the pace of real field work.
                  </p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          <div className="space-y-4">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <ScrollReveal key={step.title} delay={index * 80}>
                  <Card className="bg-[rgba(255,249,241,0.86)]">
                    <CardContent className="flex gap-5 p-7">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[rgba(var(--app-accent),0.12)] text-[rgb(var(--app-accent))]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--app-muted))]">0{index + 1}</div>
                        <h3 className="text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">{step.title}</h3>
                        <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--app-muted))]">{step.detail}</p>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <ScrollReveal className="mb-8 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Modules</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))] md:text-4xl">
            Start as transport ERP. Expand into the rest of the office only when the company is ready.
          </h2>
          <p className="mt-4 text-base leading-8 text-[rgb(var(--app-muted))]">
            The platform is designed so customers can begin with transport workflows and add time, finance, warehouse, or other
            office modules without moving to a disconnected product later.
          </p>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((module, index) => {
            const Icon = module.icon
            return (
              <ScrollReveal key={module.label} delay={index * 70}>
                <Card className="h-full bg-[rgba(255,249,241,0.88)]">
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[rgba(var(--app-accent),0.12)] text-[rgb(var(--app-accent))]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-[1.35rem]">{module.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm leading-7 text-[rgb(var(--app-muted))]">{module.detail}</CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-10 lg:pb-24">
        <ScrollReveal>
          <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(24,38,63,0.98),rgba(33,52,83,0.95))] text-white">
            <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/56">Production direction</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Give customers a product that feels operationally serious from the first scroll.
                </h2>
                <p className="mt-4 text-base leading-8 text-white/72">
                  The web app, driver mobile app, and landing surface now move in the same design family: premium, warm, and
                  modern, with motion that supports the story instead of distracting from it.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-[rgb(var(--app-contrast))] hover:bg-white/92">
                  <Link href="/login" className="no-underline">
                    Open Lumix
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/8 text-white hover:bg-white/12">
                  <Link href={`/${locale}/login`} className="no-underline">
                    Start with transport
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>
    </main>
  )
}
