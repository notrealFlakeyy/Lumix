import { Check, Zap } from 'lucide-react'

import { Link } from '@/i18n/navigation'

const plans = [
  {
    key: 'starter',
    label: 'Starter',
    price: 49,
    period: 'mo',
    description: 'Everything a small transport team needs to go paperless and stay organised.',
    highlight: false,
    badge: null,
    features: [
      '1 branch / depot',
      'Up to 5 team members',
      'Transport ERP (orders, trips, fleet, drivers)',
      'Invoicing & basic reporting',
      'Time tracking',
      'Driver mobile app',
      'Email support',
    ],
    cta: 'Start free trial',
    ctaHref: 'onboarding',
  },
  {
    key: 'growth',
    label: 'Growth',
    price: 149,
    period: 'mo',
    description: 'Multi-branch operations with purchasing, inventory, payroll and full finance.',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Up to 5 branches',
      'Up to 20 team members',
      'Everything in Starter',
      'Warehouse & inventory',
      'Purchasing & vendors',
      'Payroll preparation',
      'Accounting-lite module',
      'Expenses & task management',
      'Priority support',
    ],
    cta: 'Start free trial',
    ctaHref: 'onboarding',
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: null,
    period: null,
    description: 'Unlimited scale, custom integrations, and a dedicated implementation partner.',
    highlight: false,
    badge: null,
    features: [
      'Unlimited branches',
      'Unlimited team members',
      'Everything in Growth',
      'Custom module configuration',
      'API & webhook access',
      'SSO / SAML authentication',
      'Dedicated account manager',
      'SLA-backed uptime guarantee',
      'On-premise option available',
    ],
    cta: 'Talk to sales',
    ctaHref: 'mailto:sales@lumix.app',
  },
] as const

export default async function PlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'rgb(var(--app-bg))' }}
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lumix-dot-bg lumix-bg-mask absolute inset-0 opacity-40" />
        <div
          className="absolute left-1/2 top-[-8rem] h-[600px] w-[900px] -translate-x-1/2 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(244,127,90,0.45) 0%, transparent 65%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 lg:px-10">
        <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
          <img src="/lumix-logo-transparent.png" alt="Lumix" className="h-16 w-16 object-contain" />
        </Link>
      </header>

      <div className="relative z-10 px-5 pb-20 pt-14 lg:px-10">
        {/* Hero text */}
        <div className="lumix-rise-1 mx-auto mb-14 max-w-2xl text-center">
          <div
            className="lumix-shimmer-badge mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em]"
            style={{
              background: 'rgba(var(--app-accent), 0.1)',
              color: 'rgb(var(--app-accent))',
              border: '1px solid rgba(var(--app-accent), 0.2)',
            }}
          >
            <Zap className="h-3 w-3" />
            14-day free trial on all plans
          </div>
          <h1
            className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl"
            style={{ color: 'rgb(var(--app-contrast))' }}
          >
            Pick the right plan
            <br />
            for your company
          </h1>
          <p
            className="mt-4 text-base leading-7"
            style={{ color: 'rgb(var(--app-muted))' }}
          >
            All plans include time tracking, the driver app, and full data export.
            Upgrade or downgrade any time — no lock-in.
          </p>
        </div>

        {/* Plan cards */}
        <div className="lumix-rise-2 mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const isHighlight = plan.highlight
            const ctaIsExternal = plan.ctaHref.startsWith('mailto:')

            return (
              <div
                key={plan.key}
                className="relative flex flex-col rounded-[2rem] p-8 transition-all duration-200"
                style={
                  isHighlight
                    ? {
                        background: 'rgb(var(--app-contrast))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 32px 72px rgba(24,38,63,0.30)',
                      }
                    : {
                        background: 'rgb(var(--app-surface))',
                        border: '1px solid rgba(var(--app-muted), 0.15)',
                        boxShadow: '0 16px 40px rgba(95,73,52,0.08)',
                      }
                }
              >
                {/* Badge */}
                {plan.badge ? (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold"
                    style={{
                      background: 'rgb(var(--app-accent))',
                      color: 'rgb(var(--app-surface))',
                    }}
                  >
                    {plan.badge}
                  </div>
                ) : null}

                {/* Plan name + description */}
                <div className="mb-6">
                  <div
                    className="mb-1 text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: isHighlight ? 'rgba(var(--app-accent), 0.9)' : 'rgb(var(--app-accent))' }}
                  >
                    {plan.label}
                  </div>
                  <div
                    className="mt-3 flex items-end gap-1"
                    style={{ color: isHighlight ? 'rgb(var(--app-surface))' : 'rgb(var(--app-contrast))' }}
                  >
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-bold tracking-tight">€{plan.price}</span>
                        <span
                          className="mb-1 text-sm"
                          style={{ color: isHighlight ? 'rgba(var(--app-surface),0.55)' : 'rgb(var(--app-muted))' }}
                        >
                          /{plan.period}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold tracking-tight">Custom</span>
                    )}
                  </div>
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: isHighlight ? 'rgba(var(--app-surface), 0.6)' : 'rgb(var(--app-muted))' }}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Feature list */}
                <ul className="mb-8 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <div
                        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: isHighlight
                            ? 'rgba(var(--app-accent), 0.2)'
                            : 'rgba(var(--app-accent), 0.12)',
                        }}
                      >
                        <Check
                          className="h-2.5 w-2.5"
                          style={{ color: 'rgb(var(--app-accent))' }}
                        />
                      </div>
                      <span
                        style={{ color: isHighlight ? 'rgba(var(--app-surface), 0.82)' : 'rgb(var(--app-contrast))' }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {ctaIsExternal ? (
                  <a
                    href={plan.ctaHref}
                    className="block w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold no-underline transition-all duration-150 hover:-translate-y-[1px]"
                    style={
                      isHighlight
                        ? {
                            background: 'rgb(var(--app-accent))',
                            color: 'rgb(var(--app-surface))',
                            boxShadow: '0 8px 24px rgba(244,127,90,0.35)',
                          }
                        : {
                            background: 'rgba(var(--app-accent), 0.1)',
                            color: 'rgb(var(--app-accent))',
                            border: '1px solid rgba(var(--app-accent), 0.2)',
                          }
                    }
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={`/${plan.ctaHref}?plan=${plan.key}`}
                    className="block w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold no-underline transition-all duration-150 hover:-translate-y-[1px]"
                    style={
                      isHighlight
                        ? {
                            background: 'rgb(var(--app-accent))',
                            color: 'rgb(var(--app-surface))',
                            boxShadow: '0 8px 24px rgba(244,127,90,0.35)',
                          }
                        : {
                            background: 'rgba(var(--app-accent), 0.1)',
                            color: 'rgb(var(--app-accent))',
                            border: '1px solid rgba(var(--app-accent), 0.2)',
                          }
                    }
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <p
          className="lumix-rise-3 mt-12 text-center text-xs"
          style={{ color: 'rgba(var(--app-muted), 0.6)' }}
        >
          All prices exclude VAT. Billed monthly. Annual billing available at 20% discount — contact us.
        </p>
      </div>
    </main>
  )
}
