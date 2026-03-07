import type { Membership } from '@/types/app'

import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { activeCompanyCookieName } from '@/lib/auth/constants'

export async function getCurrentMembership() {
  const supabase = await createSupabaseServerClient()
  const cookieStore = await cookies()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, membership: null as Membership | null, memberships: [] as Membership[] }
  }

  const { data: membershipRows } = await supabase
    .from('company_users')
    .select('id, company_id, user_id, role, is_active, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (!membershipRows?.length) {
    return { supabase, user, membership: null as Membership | null, memberships: [] as Membership[] }
  }

  const companyIds = membershipRows.map((membership) => membership.company_id)
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, timezone, country')
    .in('id', companyIds)

  const companyMap = new Map((companies ?? []).map((company) => [company.id, company]))
  const memberships = membershipRows
    .map((membershipRow) => {
      const company = companyMap.get(membershipRow.company_id)
      return company
        ? {
            ...membershipRow,
            company,
          }
        : null
    })
    .filter(Boolean) as Membership[]

  const activeCompanyId = cookieStore.get(activeCompanyCookieName)?.value
  const membership = memberships.find((item) => item.company_id === activeCompanyId) ?? memberships[0] ?? null

  return { supabase, user, membership, memberships }
}
