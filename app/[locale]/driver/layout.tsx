import { DriverMobileShell } from '@/components/driver/driver-mobile-shell'
import { requireCompany } from '@/lib/auth/require-company'
import { canUseDriverWorkflow } from '@/lib/auth/permissions'
import { redirect } from '@/i18n/navigation'

export default async function DriverLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const { user, membership, memberships } = await requireCompany(locale)

  if (!canUseDriverWorkflow(membership.role) || !membership.enabledModules.includes('transport')) {
    redirect({ href: '/dashboard', locale })
  }

  return (
    <DriverMobileShell locale={locale} membership={membership} memberships={memberships} userEmail={user.email}>
      {children}
    </DriverMobileShell>
  )
}
