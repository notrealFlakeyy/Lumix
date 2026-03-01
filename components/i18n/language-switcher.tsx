'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { locales, type AppLocale } from '@/i18n/routing'
import { usePathname, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const localeLabelKey: Record<AppLocale, string> = {
  fi: 'common.locales.fi',
  sv: 'common.locales.sv',
  en: 'common.locales.en',
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations()
  const currentLocale = useLocale() as AppLocale
  const router = useRouter()
  const pathname = usePathname()

  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <span className="sr-only">{t('common.language')}</span>
      <select
        className="h-10 rounded-lg border border-border/35 bg-background px-3 text-sm text-foreground shadow-softSm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={currentLocale}
        onChange={(e) => {
          const nextLocale = e.target.value as AppLocale
          router.replace(pathname, { locale: nextLocale })
        }}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {t(localeLabelKey[locale])}
          </option>
        ))}
      </select>
    </label>
  )
}
