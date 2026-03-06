import { AppShell } from '@/components/layout/app-shell'
import { requireCompany } from '@/lib/auth/require-company'
import { getAllowedModules } from '@/lib/auth/permissions'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { user, membership } = await requireCompany(locale)

  return <AppShell locale={locale} membership={membership} allowedModules={getAllowedModules(membership.role)} userEmail={user.email}>{children}</AppShell>
}
