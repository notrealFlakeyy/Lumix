import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { AssignOrgMemberForm } from '@/components/settings/assign-org-member-form'
import { CreateUserForm } from '@/components/settings/create-user-form'

export default async function SettingsUsersPage() {
  const t = await getTranslations()
  const { orgId, role } = await getCurrentOrg()

  if (!orgId) return null
  if (!role || !['owner', 'admin'].includes(role)) notFound()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth.userManagementTitle')}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('auth.userManagementSubtitle')}</p>
      </div>

      <CreateUserForm />
      <AssignOrgMemberForm />
    </div>
  )
}
