import { redirect } from 'next/navigation'

import type { Membership } from '@/types/app'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { getDefaultAuthenticatedHref } from '@/lib/platform/routing'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] text-slate-950">
        <header className="border-b border-white/60 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <div className="text-sm font-semibold text-slate-950">Lumix Modular Operations Platform</div>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Modular operations software tailored to how each client actually works.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                Start with transport ERP, then enable warehouse, purchasing, time, payroll, or accounting modules only when
                the client needs them. One platform, tenant-aware modules, and branch-ready permissions.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Open the workspace</Link>
                </Button>
              </div>
              <p className="text-sm text-slate-500">
                Presentation-ready modular ERP foundation for client demos, pilots, and tailored rollouts.
              </p>
            </div>

            <Card className="border-slate-200/80 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-sky-700">What this platform covers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Transport foundation</div>
                  <div className="mt-1 text-sm text-slate-500">Customers, fleet, drivers, dispatch, trips, invoicing, and driver mobile workflows.</div>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Module-aware rollout</div>
                  <div className="mt-1 text-sm text-slate-500">Enable inventory, purchasing, time, payroll, or accounting only for customers that need them.</div>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Branch-ready permissions</div>
                  <div className="mt-1 text-sm text-slate-500">One tenant can stay simple, while another can operate by terminal, warehouse, or branch.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Modular platform footprint</h2>
            <p className="text-base text-slate-600">
              Transport is the flagship workflow today, but the app is now structured so each client can have a narrower or
              broader operating surface without creating a separate product fork.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Core platform</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Auth, company switching, settings, billing, reporting, audit visibility, and operational health checks.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transport ERP</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Customers, vehicles, drivers, transport orders, trips, invoicing, and document handling.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Finance follow-through</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Invoice items, payment registration, balance tracking, PDF delivery, and subscription billing readiness.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Warehouse &amp; Purchasing</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Inventory and procurement surfaces can be enabled per tenant instead of forced on every customer.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Workforce modules</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Time and payroll foundations can be enabled later without rebuilding the customer workspace.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Branch-ready structure</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Companies can define branches now and grow into more granular branch-scoped workflows over time.</CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-white/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-10">
            <div className="text-sm text-slate-500">Lumix Modular Operations Platform | {new Date().getFullYear()}</div>
            <div className="text-sm text-slate-500">Reuse the current deployment and domain wiring for production rollout.</div>
          </div>
        </footer>
      </main>
    )
  }

  const { membership } = await getCurrentMembership()
  if (!membership?.company_id) {
    redirect(`/${locale}/onboarding`)
  }

  const resolvedMembership = membership as Membership
  redirect(getDefaultAuthenticatedHref(locale, resolvedMembership.role, resolvedMembership.enabledModules))
}
