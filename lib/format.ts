import type { AppLocale } from '@/i18n/routing'

const localeToIntl: Record<AppLocale, string> = {
  fi: 'fi-FI',
  sv: 'sv-FI',
  en: 'en-FI',
}

export function formatEur(locale: AppLocale, amount: number) {
  return new Intl.NumberFormat(localeToIntl[locale], { style: 'currency', currency: 'EUR' }).format(amount)
}

export function formatDate(locale: AppLocale, date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat(localeToIntl[locale], timeZone ? { timeZone } : undefined).format(date)
}

export function formatTime(locale: AppLocale, date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat(localeToIntl[locale], {
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : null),
  }).format(date)
}
