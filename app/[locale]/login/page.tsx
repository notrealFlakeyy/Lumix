import { getTranslations } from 'next-intl/server'

import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations()

  return (
    <main className="min-h-screen bg-app px-6 py-10">
      <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between">
        <div className="text-sm text-muted-foreground">{t('common.appName')}</div>
        <LanguageSwitcher />
      </div>
      <LoginForm locale={locale} />
    </main>
  )
}
