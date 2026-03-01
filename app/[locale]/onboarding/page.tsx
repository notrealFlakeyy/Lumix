import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LogoutButton } from '@/components/auth/logout-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations()
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: membership } = await supabase.from('org_members').select('org_id').eq('user_id', user.id).maybeSingle()
  if (membership?.org_id) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <main className="min-h-screen bg-app bg-app-ambient px-6 py-12 text-foreground">
      <div className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{t('common.appName')}</div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <LogoutButton locale={locale} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t('auth.missingOrgTitle')}</h1>
          <p className="text-base text-muted-foreground">{t('auth.missingOrgMessage')}</p>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-base">{t('auth.nextStepsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t('auth.nextStepsLine1')}</p>
            <p>{t('auth.nextStepsLine2')}</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
