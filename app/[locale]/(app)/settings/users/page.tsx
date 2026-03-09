import { redirect } from 'next/navigation'

export default async function LegacySettingsUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/settings/team`)
}
