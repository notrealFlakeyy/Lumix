export const locales = ['fi', 'sv', 'en'] as const
export type AppLocale = (typeof locales)[number]

export const defaultLocale: AppLocale = 'fi'

