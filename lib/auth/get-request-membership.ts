import * as Sentry from '@sentry/nextjs'

import type { Membership } from '@/types/app'

import { activeCompanyCookieName } from '@/lib/auth/constants'
import { defaultEnabledPlatformModules, normalizeEnabledPlatformModules } from '@/lib/platform/modules'
import { createSupabaseRequestClient } from '@/lib/supabase/request'

function getBearerToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token.trim()
}

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key === name) {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return null
}

export async function getRequestMembership(request: Request) {
  const bearerToken = getBearerToken(request)
  const supabase = await createSupabaseRequestClient(bearerToken)
  const userResponse = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser()
  const user = userResponse.data.user

  if (!user) {
    return { supabase, user: null, membership: null as Membership | null, memberships: [] as Membership[] }
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  })

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
  const [{ data: companies }, { data: companyModules }, { data: companyUserBranches }] = await Promise.all([
    supabase.from('companies').select('id, name, timezone, country').in('id', companyIds),
    supabase.from('company_modules').select('company_id, module_key, is_enabled').in('company_id', companyIds),
    supabase.from('company_user_branches').select('company_id, branch_id').eq('user_id', user.id).in('company_id', companyIds),
  ])

  const companyMap = new Map((companies ?? []).map((company) => [company.id, company]))
  const companyModuleMap = new Map<string, string[]>()
  const companyBranchScopeMap = new Map<string, string[]>()

  for (const moduleRow of companyModules ?? []) {
    if (!moduleRow.is_enabled) continue
    const current = companyModuleMap.get(moduleRow.company_id) ?? []
    current.push(moduleRow.module_key)
    companyModuleMap.set(moduleRow.company_id, current)
  }

  for (const branchRow of companyUserBranches ?? []) {
    const current = companyBranchScopeMap.get(branchRow.company_id) ?? []
    current.push(branchRow.branch_id)
    companyBranchScopeMap.set(branchRow.company_id, current)
  }

  const memberships = membershipRows
    .map((membershipRow) => {
      const company = companyMap.get(membershipRow.company_id)
      const branchIds = [...new Set(companyBranchScopeMap.get(membershipRow.company_id) ?? [])]
      return company
        ? {
            ...membershipRow,
            company,
            enabledModules: normalizeEnabledPlatformModules(companyModuleMap.get(membershipRow.company_id) ?? defaultEnabledPlatformModules),
            branchIds,
            hasRestrictedBranchAccess: branchIds.length > 0,
          }
        : null
    })
    .filter(Boolean) as Membership[]

  const url = new URL(request.url)
  const requestedCompanyId =
    request.headers.get('x-company-id')?.trim() ||
    url.searchParams.get('company_id')?.trim() ||
    getCookieValue(request, activeCompanyCookieName)

  const membership = memberships.find((item) => item.company_id === requestedCompanyId) ?? memberships[0] ?? null

  if (membership) {
    Sentry.setTag('company_id', membership.company_id)
    Sentry.setTag('company_role', membership.role)
    Sentry.setContext('company', {
      id: membership.company.id,
      name: membership.company.name,
      timezone: membership.company.timezone,
      country: membership.company.country,
    })
  }

  return { supabase, user, membership, memberships, accessToken: bearerToken }
}
