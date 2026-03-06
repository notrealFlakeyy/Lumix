import { redirect } from 'next/navigation'

export default async function LegacyTimePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/trips`)
}
