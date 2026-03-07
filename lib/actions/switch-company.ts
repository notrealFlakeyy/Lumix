'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { activeCompanyCookieName } from '@/lib/auth/constants'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOptionalString, getString } from '@/lib/utils/forms'

export async function switchCompanyAction(formData: FormData) {
  const locale = getString(formData, 'locale') || 'fi'
  const companyId = getString(formData, 'company_id')
  const redirectTo = getOptionalString(formData, 'redirect_to') ?? `/${locale}/dashboard`
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: membership } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!membership?.company_id) {
    redirect(redirectTo)
  }

  const cookieStore = await cookies()
  cookieStore.set(activeCompanyCookieName, companyId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  })

  redirect(redirectTo)
}
