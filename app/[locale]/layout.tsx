import '@/app/globals.css'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { locales, type AppLocale } from '@/i18n/routing'

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

const displayFont = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  applicationName: 'Lumix Transport ERP',
  title: {
    default: 'Lumix Transport ERP',
    template: '%s | Lumix Transport ERP',
  },
  description: 'Transportation ERP for dispatch, fleet operations, driver workflows, invoicing, and reporting.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lumix ERP',
  },
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!locales.includes(locale as AppLocale)) notFound()

  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
