import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import {
  aboutStats,
  heroSignals,
  processSteps,
  serviceCards,
  serviceSpotlights,
} from '@/components/marketing/content'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { ScrollReveal } from '@/components/marketing/scroll-reveal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LandingPage({ locale }: { locale: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8efe3_0%,#f3e4d2_45%,#efe6da_100%)] text-[rgb(var(--app-fg))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="lumix-orb left-[-8rem] top-[-4rem] h-72 w-72 bg-[rgba(244,127,90,0.16)]" />
        <div className="lumix-orb right-[-4rem] top-24 h-80 w-80 bg-[rgba(24,38,63,0.12)]" />
        <div className="lumix-orb bottom-12 left-1/3 h-64 w-64 bg-[rgba(167,209,188,0.2)]" />
      </div>

      <MarketingHeader />

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-6 lg:px-10 lg:pb-24 lg:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.06fr_0.94fr]">
          <ScrollReveal className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm text-[rgb(var(--app-contrast))] shadow-[0_14px_32px_rgba(95,73,52,0.08)] backdrop-blur">
              <Sparkles className="h-4 w-4 text-[rgb(var(--app-accent))]" />
              One operating system for transport delivery, office admin, and driver follow-through
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] text-[rgb(var(--app-contrast))] md:text-7xl">
                Showcase the whole company, then move the real work into Lumix.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[rgb(var(--app-muted))] md:text-xl">
                Lumix helps transport companies run dispatch, driver workflow, finance follow-through, and office automation in
                one calmer platform, while the public site tells the story clearly to new customers and partners.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="pr-6">
                <Link href="/services" className="inline-flex items-center gap-2 no-underline">
                  Explore services <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/70">
                <Link href="/contact" className="no-underline">
                  Talk with us
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {heroSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-medium text-[rgb(var(--app-contrast))] shadow-[0_10px_22px_rgba(95,73,52,0.06)]"
                >
                  {signal}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={140} className="relative">
            <div className="lumix-dashboard-shell">
              <div className="lumix-dashboard-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/72">Operations pulse</div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Show the platform in motion, not as a static brochure.</h2>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/82">Interactive</div>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/8 p-5">
                    <div className="text-sm text-white">Public website</div>
                    <div className="mt-2 text-4xl font-semibold text-white">Clear</div>
                    <div className="mt-3 text-sm leading-6 text-white">
                      Dedicated pages for services, company story, and contact make the public experience feel intentional and professional.
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-[rgba(244,127,90,0.16)] p-5">
                    <div className="text-sm text-white">Workspace handoff</div>
                    <div className="mt-2 text-4xl font-semibold text-white">Seamless</div>
                    <div className="mt-3 text-sm leading-6 text-white">
                      Visitors can understand the service first, then move into login and onboarding without context loss.
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {serviceCards.slice(0, 4).map((service) => (
                    <div key={service.title} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white">
                      <span>{service.title}</span>
                      <ChevronRight className="h-4 w-4 text-white/60" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lumix-floating-metric right-5 top-0">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[rgb(var(--app-muted))]">Public presence</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Multi-page</div>
              </div>
              <div className="lumix-floating-metric bottom-10 left-[-1rem] bg-[rgba(167,209,188,0.92)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-[rgba(24,38,63,0.6)]">Experience</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Responsive</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-10 lg:py-16">
        <ScrollReveal className="mb-8 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Services at a glance</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))] md:text-4xl">
            The public site can now tell the whole product story instead of hiding everything behind login.
          </h2>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceCards.map((service, index) => {
            const Icon = service.icon
            return (
              <ScrollReveal key={service.title} delay={index * 70}>
                <Card className="group h-full bg-[rgba(255,249,241,0.88)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(95,73,52,0.12)]">
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[rgba(var(--app-accent),0.12)] text-[rgb(var(--app-accent))] transition group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-[1.35rem]">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-sm leading-7 text-[rgb(var(--app-muted))]">{service.summary}</p>
                    {service.points ? (
                      <div className="space-y-3">
                        {service.points.map((point) => (
                          <div key={point} className="flex items-start gap-3 text-sm text-[rgb(var(--app-contrast))]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--app-accent))]" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-10 lg:py-16">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ScrollReveal className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">What the experience shows</div>
            <h2 className="text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))] md:text-4xl">
              Each page can explain a different part of the service without losing the shared design language.
            </h2>
            <p className="text-base leading-8 text-[rgb(var(--app-muted))]">
              Services, about, and contact now work like a real public site. That gives you room to explain how Lumix helps a
              transport operator before you ask them to sign in.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {aboutStats.map((item) => (
                <Card key={item.label} className="bg-[rgba(255,249,241,0.86)]">
                  <CardContent className="p-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--app-muted))]">{item.label}</div>
                    <div className="mt-3 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">{item.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollReveal>

          <div className="space-y-4">
            {serviceSpotlights.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 80}>
                <Card className="bg-[rgba(255,249,241,0.88)]">
                  <CardContent className="space-y-3 p-7">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--app-muted))]">{item.eyebrow}</div>
                    <h3 className="text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">{item.title}</h3>
                    <p className="text-sm leading-7 text-[rgb(var(--app-muted))]">{item.detail}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-10 lg:py-16">
        <ScrollReveal className="mb-8 max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">How Lumix rolls out</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-contrast))] md:text-4xl">
            The service story now has a clear path from first visit to real operational rollout.
          </h2>
        </ScrollReveal>

        <div className="grid gap-5 lg:grid-cols-4">
          {processSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <ScrollReveal key={step.title} delay={index * 70}>
                <Card className="h-full bg-[rgba(24,38,63,0.96)] text-white">
                  <CardContent className="space-y-4 p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/58">0{index + 1}</div>
                    <h3 className="text-xl font-semibold tracking-tight text-white">{step.title}</h3>
                    <p className="text-sm leading-7 text-white/74">{step.summary}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-6 lg:px-10 lg:pb-24">
        <ScrollReveal>
          <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(24,38,63,0.98),rgba(33,52,83,0.95))] text-white">
            <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/56">Next step</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Let the public site explain the value, then let the platform prove it.
                </h2>
                <p className="mt-4 text-base leading-8 text-white/72">
                  Services, about, and contact are now first-class pages. The rest of the site can keep evolving around that
                  stronger company story.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-[rgb(var(--app-contrast))] hover:bg-white/92">
                  <Link href="/about" className="inline-flex items-center gap-2 no-underline">
                    About Lumix <Building2 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/8 text-white hover:bg-white/12">
                  <Link href="/contact" className="inline-flex items-center gap-2 no-underline">
                    Contact us <BriefcaseBusiness className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </section>

      <MarketingFooter />
    </main>
  )
}
