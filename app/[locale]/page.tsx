import { redirect } from 'next/navigation'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'

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
            <div className="text-sm font-semibold text-slate-950">Lumix Transport ERP</div>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">Transportation ERP built for real dispatch and billing workflows.</h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                Replace disconnected dispatch sheets, weak reporting, and manual invoicing steps with one company-aware operations platform designed for logistics teams.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Open the ERP workspace</Link>
                </Button>
              </div>
              <p className="text-sm text-slate-500">Presentation-ready MVP for client demos and operator feedback rounds.</p>
            </div>

            <Card className="border-slate-200/80 bg-white/90 shadow-soft">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-sky-700">What this MVP covers</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Dispatch control</div>
                  <div className="mt-1 text-sm text-slate-500">Customers, fleet, drivers, transport orders, and trip progression in one shell.</div>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Finance follow-through</div>
                  <div className="mt-1 text-sm text-slate-500">Invoice creation from trips, payment registration, and overdue tracking.</div>
                </div>
                <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-5">
                  <div className="text-sm font-medium">Believable reporting</div>
                  <div className="mt-1 text-sm text-slate-500">Revenue views by customer, vehicle, and driver with live demo seed data.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Core ERP modules</h2>
            <p className="text-base text-slate-600">The current project has been adapted into a transportation-focused SaaS workflow rather than a generic back-office template.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Monthly revenue, active order load, completed trips, overdue invoices, and recent activity.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Operations</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Customers, vehicles, drivers, transport orders, trips, and assignment visibility.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoicing & Payments</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Invoice items, payment registration, balance tracking, and PDF/export preparation.</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reports</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-500">Revenue by customer, vehicle, and driver plus invoice status and trip volume trends.</CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-white/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-10">
            <div className="text-sm text-slate-500">Lumix Transport ERP MVP • {new Date().getFullYear()}</div>
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

  if (membership.role === 'driver') {
    redirect(`/${locale}/driver`)
  }

  redirect(`/${locale}/dashboard`)
}
