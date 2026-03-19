import { BarChart3, CheckSquare2, Receipt, Truck } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { LoginForm } from '@/components/auth/login-form'

const benefits = [
  { icon: Truck,        text: 'Transport, fleet & driver workflows' },
  { icon: Receipt,      text: 'Invoicing, expenses & accounting' },
  { icon: CheckSquare2, text: 'Tasks, maintenance & workforce' },
  { icon: BarChart3,    text: 'Reports across every module' },
] as const

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: 'rgb(var(--app-bg))' }}
    >
      {/* Background blobs + dot grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lumix-dot-bg lumix-bg-mask absolute inset-0 opacity-50" />
        <div
          className="lumix-blob-a absolute left-[-10rem] top-[-6rem] h-[500px] w-[500px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, rgba(244,127,90,0.5) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="lumix-blob-b absolute bottom-[-4rem] right-[-8rem] h-[400px] w-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(24,38,63,0.55) 0%, transparent 70%)',
            filter: 'blur(72px)',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
          <img src="/lumix-logo-transparent.png" alt="Lumix" className="h-16 w-16 object-contain" />
        </Link>
      </header>

      {/* Two-column layout */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 lg:px-10">
        <div className="grid w-full max-w-5xl items-center gap-16 lg:grid-cols-[1fr_420px]">

          {/* Left — brand copy */}
          <div className="lumix-rise-1 space-y-8">
            <div>
              <div
                className="mb-4 text-xs font-semibold uppercase tracking-[0.24em]"
                style={{ color: 'rgb(var(--app-accent))' }}
              >
                All office operations
              </div>
              <h1
                className="text-4xl font-semibold leading-[1.1] tracking-[-0.04em] sm:text-5xl"
                style={{ color: 'rgb(var(--app-contrast))' }}
              >
                Your whole company,
                <br />
                one workspace.
              </h1>
              <p
                className="mt-5 max-w-md text-base leading-7"
                style={{ color: 'rgb(var(--app-muted))' }}
              >
                Lumix connects every department — from the driver's phone to the finance
                team's desk — without stitching together separate apps.
              </p>
            </div>

            {/* Benefit list */}
            <ul className="space-y-3">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(var(--app-accent), 0.1)', color: 'rgb(var(--app-accent))' }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'rgb(var(--app-contrast))' }}>
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            {/* Tagline chip */}
            <div
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(var(--app-muted), 0.08)',
                color: 'rgb(var(--app-muted))',
                border: '1px solid rgba(var(--app-muted), 0.14)',
              }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'rgb(var(--app-accent))' }} />
              Enable only the modules your company needs — add more as you grow.
            </div>
          </div>

          {/* Right — login card */}
          <div className="lumix-rise-2">
            <div
              className="rounded-[2rem] p-8"
              style={{
                background: 'rgb(var(--app-surface))',
                border: '1px solid rgba(var(--app-muted), 0.15)',
                boxShadow: '0 24px 64px rgba(95,73,52,0.10)',
              }}
            >
              <div className="mb-6">
                <h2
                  className="text-xl font-semibold tracking-tight"
                  style={{ color: 'rgb(var(--app-contrast))' }}
                >
                  Sign in to your workspace
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
                  Enter your email and password to continue.
                </p>
              </div>

              <LoginForm locale={locale} />

              <p
                className="mt-5 text-center text-xs leading-relaxed"
                style={{ color: 'rgba(var(--app-muted), 0.7)' }}
              >
                New to Lumix?{' '}
                <Link href="/signup" className="font-medium underline-offset-2">
                  Create your company
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
