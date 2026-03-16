import { redirect } from 'next/navigation'

import type { AppModule } from '@/types/app'

import { requireCompany } from '@/lib/auth/require-company'
import { canAccessModule } from '@/lib/auth/permissions'

export async function requireModuleAccess(locale: string, module: AppModule) {
  const context = await requireCompany(locale)

  if (!canAccessModule(context.membership.role, module, context.membership.enabledModules)) {
    redirect(`/${locale}/settings/company?error=${encodeURIComponent(`The ${module} module is not enabled for this company.`)}`)
  }

  return context
}
