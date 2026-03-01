'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

export default function LocaleErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations()

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-5 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('errors.unexpectedTitle')}</h1>
        <p className="text-muted-foreground">{t('errors.unexpectedMessage')}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          {t('common.tryAgain')}
        </Button>
      </div>
    </main>
  )
}

