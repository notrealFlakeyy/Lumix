import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EntryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-app bg-app-ambient text-foreground">
        <header className="border-b border-border/25 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
            <div className="text-sm font-semibold text-foreground">{t('common.appName')}</div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Button asChild variant="outline" size="sm">
                <Link href="/login">{t('auth.login')}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">{t('auth.signup')}</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{t('common.landing.heroTitle')}</h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                {t('common.landing.heroSubtitle')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">{t('common.landing.primaryCta')}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">{t('common.landing.secondaryCta')}</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{t('common.landing.trustNote')}</p>
            </div>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-accent">{t('common.landing.kicker')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-lg border border-border/25 bg-background p-5">
                  <div className="text-sm font-medium">{t('common.landing.kpi1Title')}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t('common.landing.kpi1Desc')}</div>
                </div>
                <div className="rounded-lg border border-border/25 bg-background p-5">
                  <div className="text-sm font-medium">{t('common.landing.kpi2Title')}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t('common.landing.kpi2Desc')}</div>
                </div>
                <div className="rounded-lg border border-border/25 bg-background p-5">
                  <div className="text-sm font-medium">{t('common.landing.kpi3Title')}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t('common.landing.kpi3Desc')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight">{t('common.landing.featuresTitle')}</h2>
            <p className="text-base text-muted-foreground">{t('common.landing.featuresSubtitle')}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('sales.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featureSales')}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('purchases.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featurePurchases')}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('accounting.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featureAccounting')}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('reporting.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featureReporting')}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('payroll.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featurePayroll')}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('inventory.title')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{t('common.landing.featureInventory')}</CardContent>
            </Card>
          </div>
        </section>

        <footer className="border-t border-border/25">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between lg:px-10">
            <div className="text-sm text-muted-foreground">{t('common.landing.footer', { year: String(new Date().getFullYear()) })}</div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground">
                {t('common.landing.privacy')}
              </a>
              <a href="#" className="hover:text-foreground">
                {t('common.landing.terms')}
              </a>
            </div>
          </div>
        </footer>
      </main>
    )
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership?.org_id) {
    redirect(`/${locale}/signup`)
  }

  redirect(`/${locale}/dashboard`)
}
