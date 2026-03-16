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
  const { user, membership, memberships } = await requireCompany(locale)

  return (
    <AppShell locale={locale} membership={membership} memberships={memberships} allowedModules={getAllowedModules(membership.role, membership.enabledModules)} userEmail={user.email}>
      {children}
    </AppShell>
  )
}
