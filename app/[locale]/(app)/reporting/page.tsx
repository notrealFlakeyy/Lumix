import { redirect } from 'next/navigation'

export default async function LegacyReportingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/reports`)
}
