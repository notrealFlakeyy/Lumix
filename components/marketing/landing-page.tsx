import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CirclePlay,
  Sparkles,
} from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { aboutStats, heroSignals, processSteps, serviceCards, serviceSpotlights } from '@/components/marketing/content'
import { PaperHeroIllustration } from '@/components/marketing/paper-hero-illustration'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { ScrollReveal } from '@/components/marketing/scroll-reveal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LandingPage({ locale }: { locale: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fcf4ea] text-[rgb(var(--app-fg))]">
      <div className="pointer-events-none absolute inset-0">
        <div className="paper-grid absolute inset-0 opacity-70" />
        <div className="paper-blob left-[-10rem] top-[-6rem] h-80 w-80 bg-[rgba(244,127,90,0.22)]" />
        <div className="paper-blob right-[-7rem] top-32 h-[26rem] w-[26rem] bg-[rgba(170,205,177,0.22)]" />
        <div className="paper-blob bottom-[-10rem] left-1/3 h-[24rem] w-[24rem] bg-[rgba(255,214,177,0.34)]" />
      </div>

      <MarketingHeader />

      <section className="relative mx-auto max-w-7xl px-5 pb-18 pt-12 sm:px-6 lg:px-10 lg:pb-24 lg:pt-18">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <ScrollReveal delay={80} className="order-2 lg:order-1">
            <div className="paper-hero-visual">
              <div className="paper-hero-surface">
                <div className="paper-hero-glow bg-[rgba(244,127,90,0.18)]" />
                <PaperHeroIllustration />
                <div className="paper-hero-leaf left-10 top-10 h-24 w-16 rotate-[-18deg] bg-[#ffd9a9]" />
                <div className="paper-hero-leaf left-20 top-28 h-20 w-14 rotate-[12deg] bg-[#b8d9c1]" />
                <div className="paper-hero-leaf right-12 top-16 h-28 w-16 rotate-[16deg] bg-[#f7a97f]" />
                <div className="paper-hero-leaf right-20 bottom-14 h-24 w-14 rotate-[-16deg] bg-[#c7dfcc]" />

                <div className="paper-stack-card left-6 top-8">
                  <div className="paper-stack-badge bg-[#2f3f31]" />
                  <div className="paper-stack-line w-28" />
                  <div className="paper-stack-line w-20" />
                </div>

                <div className="paper-stack-card right-8 top-24">
                  <div className="paper-stack-badge bg-[#ea7846]" />
                  <div className="paper-stack-line w-24" />
                  <div className="paper-stack-line w-16" />
                </div>

                <div className="paper-feature-card left-8 bottom-10">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-[rgb(var(--app-muted))]">Dispatch</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[rgb(var(--app-contrast))]">Calmer</div>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--app-muted))]">
                    Orders, trips, and proof follow-through in one view.
                  </p>
                </div>

                <div className="paper-feature-card right-10 bottom-8 bg-[#243654] text-white">
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/62">Field + office</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white">Connected</div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    A shared rhythm for drivers, dispatch, and finance follow-through.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="order-1 space-y-8 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,28,21,0.08)] bg-white/85 px-4 py-2 text-sm text-[rgb(var(--app-contrast))] shadow-[0_18px_34px_rgba(91,64,40,0.08)]">
              <Sparkles className="h-4 w-4 text-[rgb(var(--app-accent))]" />
              Inspired by the linked Paperpillar-style direction: soft editorial, rounded, warm, and illustration-led
            </div>

            <div className="space-y-5">
              <h1 className="paper-display max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[rgb(var(--app-contrast))] sm:text-6xl lg:text-[5.2rem] lg:leading-[0.95]">
                A softer, clearer front page for a serious transport platform.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[rgb(var(--app-muted))] md:text-xl">
                Lumix brings dispatch, driver workflow, finance follow-through, and office automation into one premium operating
                rhythm, while the public site explains the service with more warmth and confidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-[rgb(var(--app-accent))] px-7 text-[rgb(var(--app-contrast))] shadow-[0_20px_36px_rgba(234,108,63,0.22)] hover:bg-[rgb(var(--app-accent))]/90"
              >
                <Link href="/services" className="inline-flex items-center gap-2 no-underline">
                  Explore services <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-[rgba(34,28,21,0.14)] bg-white/70 px-7 text-[rgb(var(--app-contrast))]">
                <Link href="/contact" className="inline-flex items-center gap-2 no-underline">
                  Talk with us <CirclePlay className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroSignals.map((signal) => (
                <div
                  key={signal}
                  className="paper-hover-card rounded-[1.75rem] border border-[rgba(34,28,21,0.08)] bg-white/84 px-4 py-4 text-sm font-medium text-[rgb(var(--app-contrast))] shadow-[0_14px_28px_rgba(91,64,40,0.06)]"
                >
                  {signal}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-10 lg:py-16">
        <ScrollReveal className="mb-8 max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--app-muted))]">Service layers</div>
          <h2 className="paper-display mt-3 text-3xl font-semibold tracking-[-0.04em] text-[rgb(var(--app-contrast))] md:text-[3.25rem]">
            Softer visual language, same operational depth underneath.
          </h2>
        </ScrollReveal>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceCards.map((service, index) => {
            const Icon = service.icon
            return (
              <ScrollReveal key={service.title} delay={index * 70}>
                <Card className="paper-hover-card h-full rounded-[2rem] border-[rgba(34,28,21,0.08)] bg-white/88 shadow-[0_24px_44px_rgba(91,64,40,0.08)]">
                  <CardHeader className="space-y-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[#ffe4cb] text-[rgb(var(--app-accent))]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="paper-display text-[1.45rem]">{service.title}</CardTitle>
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
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <ScrollReveal>
            <div className="paper-story-panel bg-[#243654] text-white">
              <div className="paper-story-bubble bg-[rgba(255,255,255,0.12)]" />
              <div className="paper-story-bubble bottom-8 right-10 h-28 w-28 bg-[rgba(244,127,90,0.16)]" />
              <div className="relative z-10 space-y-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/58">Experience direction</div>
                <h2 className="paper-display text-3xl font-semibold tracking-[-0.04em] text-white md:text-[3rem]">
                  The landing page now feels more like a designed campaign than an admin brochure.
                </h2>
                <p className="max-w-2xl text-base leading-8 text-white/74">
                  This direction borrows the same kind of soft cream canvas, warm orange accents, rounded illustration blocks,
                  and editorial spacing from the linked Paperpillar reference while keeping Lumix-specific content and structure.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {aboutStats.map((item) => (
                    <div key={item.label} className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-white/52">{item.label}</div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          <div className="space-y-5">
            {serviceSpotlights.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 90}>
                <Card className="paper-hover-card rounded-[2rem] border-[rgba(34,28,21,0.08)] bg-[#fff8f1] shadow-[0_24px_44px_rgba(91,64,40,0.06)]">
                  <CardContent className="space-y-3 p-7">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--app-muted))]">{item.eyebrow}</div>
                    <h3 className="paper-display text-2xl font-semibold tracking-[-0.03em] text-[rgb(var(--app-contrast))]">{item.title}</h3>
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--app-muted))]">Rollout path</div>
          <h2 className="paper-display mt-3 text-3xl font-semibold tracking-[-0.04em] text-[rgb(var(--app-contrast))] md:text-[3.1rem]">
            Let the story feel light while the product still reads as operationally serious.
          </h2>
        </ScrollReveal>

        <div className="grid gap-5 lg:grid-cols-4">
          {processSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <ScrollReveal key={step.title} delay={index * 70}>
                <Card className="paper-hover-card h-full rounded-[2rem] border-[rgba(34,28,21,0.08)] bg-white/88 shadow-[0_22px_40px_rgba(91,64,40,0.06)]">
                  <CardContent className="space-y-4 p-7">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-[#e9f2ea] text-[#2f5b43]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgb(var(--app-muted))]">0{index + 1}</div>
                    <h3 className="paper-display text-xl font-semibold tracking-[-0.03em] text-[rgb(var(--app-contrast))]">{step.title}</h3>
                    <p className="text-sm leading-7 text-[rgb(var(--app-muted))]">{step.summary}</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-6 lg:px-10 lg:pb-24">
        <ScrollReveal>
          <Card className="overflow-hidden rounded-[2.5rem] border-none bg-[#ef7c4c] text-[rgb(var(--app-contrast))] shadow-[0_34px_60px_rgba(234,108,63,0.24)]">
            <CardContent className="flex flex-col gap-8 p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
              <div className="max-w-3xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgba(24,38,63,0.62)]">Next step</div>
                <h2 className="paper-display mt-4 text-3xl font-semibold tracking-[-0.04em] text-[rgb(var(--app-contrast))] md:text-[3rem]">
                  Keep the public side warm and memorable, while the portal stays focused on the work.
                </h2>
                <p className="mt-4 text-base leading-8 text-[rgba(24,38,63,0.78)]">
                  Services, about, and contact already support the story. This homepage now gives Lumix a more designed
                  first impression to match them.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-[rgb(var(--app-contrast))] px-7 text-white hover:bg-[rgb(var(--app-contrast))]/92">
                  <Link href="/about" className="inline-flex items-center gap-2 no-underline">
                    About Lumix <Building2 className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full border-[rgba(24,38,63,0.18)] bg-white/24 px-7 text-[rgb(var(--app-contrast))] hover:bg-white/34">
                  <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 no-underline">
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
