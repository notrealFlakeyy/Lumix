import { redirect } from 'next/navigation'

export default async function LegacyInventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/vehicles`)
}
