import type { AppLocale } from '@/i18n/routing'

const localeToIntl: Record<AppLocale, string> = {
  fi: 'fi-FI',
  sv: 'sv-FI',
  en: 'en-FI',
}

export function formatEur(locale: AppLocale, amount: number) {
  return new Intl.NumberFormat(localeToIntl[locale], { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(locale: AppLocale, date: Date) {
  return new Intl.DateTimeFormat(localeToIntl[locale]).format(date)
}

