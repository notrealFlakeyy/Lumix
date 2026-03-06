import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-12 text-slate-950">
      <div className="mx-auto mb-12 flex max-w-5xl items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Lumix</div>
          <div className="mt-2 text-xl font-semibold tracking-tight">Transportation ERP MVP</div>
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="max-w-xl space-y-4">
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950">Dispatch, trips, invoicing, and reporting in one operating system.</h1>
            <p className="text-lg leading-8 text-slate-600">
              Built for transportation companies that need tighter operational visibility, less manual work, and clearer revenue tracking by customer, vehicle, and driver.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-softSm">
              <div className="text-sm font-semibold text-slate-900">Order-to-Invoice Flow</div>
              <p className="mt-2 text-sm text-slate-500">Create transport orders, convert them into trips, and invoice from completed work.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-softSm">
              <div className="text-sm font-semibold text-slate-900">Operational Visibility</div>
              <p className="mt-2 text-sm text-slate-500">See active orders, overdue invoices, and monthly completions at a glance.</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-softSm">
              <div className="text-sm font-semibold text-slate-900">Tenant-Aware Foundation</div>
              <p className="mt-2 text-sm text-slate-500">Company-scoped data model with starter role gating for dispatch, finance, and driver access.</p>
            </div>
          </div>
        </section>
        <LoginForm locale={locale} />
      </div>
    </main>
  )
}
