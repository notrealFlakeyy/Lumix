import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

export default async function LocaleNotFound() {
  const t = await getTranslations()

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-5 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('errors.notFoundTitle')}</h1>
        <p className="text-muted-foreground">{t('errors.notFoundMessage')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/login">{t('auth.login')}</Link>
        </Button>
      </div>
    </main>
  )
}

