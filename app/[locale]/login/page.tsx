import { getTranslations } from 'next-intl/server'

import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations()

  return (
    <main className="min-h-screen bg-app bg-app-ambient px-6 py-12 text-foreground">
      <div className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{t('common.appName')}</div>
        <LanguageSwitcher />
      </div>
      <LoginForm locale={locale} />
    </main>
  )
}
