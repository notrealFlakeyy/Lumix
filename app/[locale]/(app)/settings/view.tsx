import type { User as SupabaseUser } from '@supabase/supabase-js'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { PageHeader } from '@/components/layout/page-header'
import { InviteLinkPanel } from '@/components/settings/invite-link-panel'
import { MonitoringTestPanel } from '@/components/settings/monitoring-test-panel'
import { CsvOnboardingPanel } from '@/components/settings/csv-onboarding-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { billingPlans, isBillablePlanKey } from '@/lib/billing/plans'
import { createBillingCheckoutSession, createBillingPortalSession } from '@/lib/billing/stripe'
import { canManageSettings } from '@/lib/auth/permissions'
import { getBillingOverview } from '@/lib/db/queries/billing'
import { defaultCompanyAppSettings, getCompanyAppSettings } from '@/lib/db/queries/company-settings'
import { createCustomer, updateCustomer } from '@/lib/db/mutations/customers'
import { mergeCustomerDuplicate, mergeDriverDuplicate, mergeVehicleDuplicate } from '@/lib/db/mutations/data-hygiene'
import { createDriver, updateDriver } from '@/lib/db/mutations/drivers'
import { createVehicle, updateVehicle } from '@/lib/db/mutations/vehicles'
import { requireCompany } from '@/lib/auth/require-company'
import { listRecentAuditLogs } from '@/lib/db/queries/audit'
import { getCompanyDiagnostics } from '@/lib/db/queries/support'
import { insertAuditLog } from '@/lib/db/shared'
import { getBillingEnv, hasStripeBillingConfig, hasStripeWebhookConfig } from '@/lib/env/billing'
import { hasEmailDeliveryConfig } from '@/lib/env/email'
import { getMonitoringEnv, hasSentryConfig, hasSentrySourceMapConfig } from '@/lib/env/monitoring'
import { getServiceRoleEnv } from '@/lib/env/service-role'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { defaultEnabledPlatformModules, platformModuleDefinitions } from '@/lib/platform/modules'
import { parseCsvRecords } from '@/lib/utils/csv'
import type { TableRow as DbTableRow } from '@/types/database'
import { companyRoles, platformModuleKeys, type CompanyBranch, type CompanyModule, type CompanyRole, type PlatformModuleKey } from '@/types/app'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'
import { formatDateTime } from '@/lib/utils/dates'
import { companyAppSettingsSchema } from '@/lib/validations/company-settings'
import { customerSchema } from '@/lib/validations/customer'
import { driverSchema } from '@/lib/validations/driver'
import { vehicleSchema } from '@/lib/validations/vehicle'
import * as Sentry from '@sentry/nextjs'

type MembershipRow = {
  user_id: string
  role: string
  is_active: boolean
  created_at: string
}

type AuthLifecycle = {
  label: string
  variant: 'default' | 'success' | 'warning' | 'destructive'
  detail: string
  canResendInvite: boolean
}

type InviteLinkPayload = {
  email: string
  actionLink: string
  generatedAt: string
}

type CsvImportBranch = Pick<DbTableRow<'branches'>, 'id' | 'code' | 'name'>

export type SettingsSection = 'overview' | 'company' | 'team' | 'billing' | 'operations' | 'data'

const INVITE_LINK_COOKIE = 'lumix_invite_link'

const settingsSectionMeta: Record<
  SettingsSection,
  {
    title: string
    description: string
    hrefSegment: '' | 'company' | 'team' | 'billing' | 'operations' | 'data'
  }
> = {
  overview: {
    title: 'Settings',
    description: 'Choose the admin area you want to work in instead of scrolling through a single catch-all page.',
    hrefSegment: '',
  },
  company: {
    title: 'Company Settings',
    description: 'Maintain company identity, numbering defaults, invoice rules, and profitability assumptions.',
    hrefSegment: 'company',
  },
  team: {
    title: 'Team Settings',
    description: 'Invite users, manage memberships, and link driver logins without leaving the app.',
    hrefSegment: 'team',
  },
  billing: {
    title: 'Billing Settings',
    description: 'Manage Stripe plans, billing portal access, and subscription sync readiness.',
    hrefSegment: 'billing',
  },
  operations: {
    title: 'Operations Settings',
    description: 'Track rollout readiness, monitoring setup, deployment checks, and audit activity.',
    hrefSegment: 'operations',
  },
  data: {
    title: 'Data Settings',
    description: 'Handle CSV onboarding, data hygiene, duplicate cleanup, and tenant diagnostics.',
    hrefSegment: 'data',
  },
}

function isSettingsSection(value: string | undefined): value is SettingsSection {
  return value === 'overview' || value === 'company' || value === 'team' || value === 'billing' || value === 'operations' || value === 'data'
}

function buildSettingsHref(locale: string, sectionOrExtras?: SettingsSection | Record<string, string>, maybeExtras?: Record<string, string>) {
  const section: SettingsSection = typeof sectionOrExtras === 'string' && isSettingsSection(sectionOrExtras) ? sectionOrExtras : 'overview'
  const extras = typeof sectionOrExtras === 'string' ? maybeExtras : sectionOrExtras
  const params = new URLSearchParams(extras)
  const query = params.toString()
  const hrefSegment = settingsSectionMeta[section].hrefSegment
  const basePath = hrefSegment ? `/${locale}/settings/${hrefSegment}` : `/${locale}/settings`
  return `${basePath}${query ? `?${query}` : ''}`
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function parseRole(value: string): CompanyRole {
  if (companyRoles.includes(value as CompanyRole)) {
    return value as CompanyRole
  }

  throw new Error('Invalid company role.')
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function parseCsvBoolean(value: string | null | undefined, fallback = true) {
  const normalized = normalizeText(value)
  if (!normalized) {
    return fallback
  }

  if (['true', '1', 'yes', 'y', 'active'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'n', 'inactive'].includes(normalized)) {
    return false
  }

  return fallback
}

function resolveImportedBranchId(
  row: Record<string, string>,
  branches: CsvImportBranch[],
  membership: { branchIds: string[]; hasRestrictedBranchAccess: boolean },
) {
  const rawBranch = row.branch_code || row.branch_name || ''
  if (!rawBranch) {
    if (membership.hasRestrictedBranchAccess) {
      if (branches.length === 1) {
        return branches[0].id
      }
      throw new Error('Branch code is required when your access is limited to specific branches.')
    }

    return undefined
  }

  const normalizedBranch = normalizeText(rawBranch)
  const matchedBranch =
    branches.find((branch) => branch.code && normalizeText(branch.code) === normalizedBranch) ??
    branches.find((branch) => normalizeText(branch.name) === normalizedBranch)

  if (!matchedBranch) {
    throw new Error(`Unknown branch reference "${rawBranch}". Use an active branch code or exact branch name.`)
  }

  return matchedBranch.id
}

function getSubscriptionBadgeVariant(status: string | null | undefined): 'default' | 'success' | 'warning' | 'destructive' {
  if (!status) return 'default'
  if (status === 'active' || status === 'trialing') return 'success'
  if (status === 'past_due' || status === 'incomplete') return 'warning'
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') return 'destructive'
  return 'default'
}

function parseInviteLinkCookie(value: string | undefined): InviteLinkPayload | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<InviteLinkPayload>
    if (!parsed.email || !parsed.actionLink || !parsed.generatedAt) {
      return null
    }

    return {
      email: parsed.email,
      actionLink: parsed.actionLink,
      generatedAt: parsed.generatedAt,
    }
  } catch {
    return null
  }
}

async function setInviteLinkCookie(payload: InviteLinkPayload) {
  const cookieStore = await cookies()
  cookieStore.set(INVITE_LINK_COOKIE, encodeURIComponent(JSON.stringify(payload)), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 30,
  })
}

async function clearInviteLinkCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(INVITE_LINK_COOKIE)
}

function getAuthLifecycle(user: SupabaseUser | null | undefined): AuthLifecycle {
  if (!user) {
    return {
      label: 'Unavailable',
      variant: 'default',
      detail: 'Auth account details could not be loaded.',
      canResendInvite: false,
    }
  }

  if (user.last_sign_in_at) {
    return {
      label: 'Active login',
      variant: 'success',
      detail: `Last sign-in ${formatTimestamp(user.last_sign_in_at) ?? 'recorded'}.`,
      canResendInvite: false,
    }
  }

  if (user.email_confirmed_at) {
    return {
      label: 'Confirmed',
      variant: 'success',
      detail: `Email confirmed ${formatTimestamp(user.email_confirmed_at) ?? 'recently'}.`,
      canResendInvite: false,
    }
  }

  if (user.invited_at || user.confirmation_sent_at) {
    return {
      label: 'Invite pending',
      variant: 'warning',
      detail: `Invite last sent ${formatTimestamp(user.invited_at ?? user.confirmation_sent_at) ?? 'recently'}.`,
      canResendInvite: true,
    }
  }

  return {
    label: 'Provisioned',
    variant: 'default',
    detail: 'Account exists but has not completed access setup.',
    canResendInvite: true,
  }
}

async function listAuthUsers() {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (error) {
    throw new Error(error.message)
  }

  return data.users
}

async function getAuthUserMap(userIds: string[]) {
  const users = await listAuthUsers()
  const relevantIds = new Set(userIds)
  return new Map(users.filter((user) => relevantIds.has(user.id)).map((user) => [user.id, user]))
}

async function findAuthUserByEmail(email: string) {
  const users = await listAuthUsers()
  return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) ?? null
}

export async function SettingsView({
  params,
  searchParams,
  section = 'overview',
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ success?: string; error?: string }>
  section?: SettingsSection
}) {
  const { locale } = await params
  const { success, error } = await searchParams
  const inviteLinkData = parseInviteLinkCookie((await cookies()).get(INVITE_LINK_COOKIE)?.value)
  const { supabase, membership, user } = await requireCompany(locale)

  const [company, memberships, profiles, drivers, customers, vehicles, companyModules, branches, companyUserBranches] = await Promise.all([
    supabase.from('companies').select('*').eq('id', membership.company_id).single(),
    supabase.from('company_users').select('user_id, role, is_active, created_at').eq('company_id', membership.company_id).order('created_at'),
    supabase.from('profiles').select('id, full_name, phone'),
    supabase.from('drivers').select('*').eq('company_id', membership.company_id).order('full_name'),
    supabase.from('customers').select('name, business_id, email').eq('company_id', membership.company_id).order('name'),
    supabase.from('vehicles').select('registration_number').eq('company_id', membership.company_id).order('registration_number'),
    supabase.from('company_modules').select('*').eq('company_id', membership.company_id).order('module_key'),
    supabase.from('branches').select('*').eq('company_id', membership.company_id).order('name'),
    supabase.from('company_user_branches').select('user_id, branch_id').eq('company_id', membership.company_id),
  ])
  const companyData = company.data as DbTableRow<'companies'> | null
  if (!companyData) return null

  const membershipRows = (memberships.data ?? []) as MembershipRow[]
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]))
  const driverRows = (drivers.data ?? []) as DbTableRow<'drivers'>[]
  const customerRows = (customers.data ?? []) as Pick<DbTableRow<'customers'>, 'name' | 'business_id' | 'email'>[]
  const vehicleRows = (vehicles.data ?? []) as Pick<DbTableRow<'vehicles'>, 'registration_number'>[]
  const companyModuleRows = (companyModules.data ?? []) as CompanyModule[]
  const branchRows = (branches.data ?? []) as CompanyBranch[]
  const companyUserBranchRows = (companyUserBranches.data ?? []) as Array<Pick<DbTableRow<'company_user_branches'>, 'user_id' | 'branch_id'>>
  const [recentAuditLogs, diagnostics, billingOverview, companyAppSettings] = await Promise.all([
    listRecentAuditLogs(membership.company_id, 10, supabase),
    getCompanyDiagnostics(membership.company_id, supabase),
    getBillingOverview(membership.company_id, supabase),
    getCompanyAppSettings(membership.company_id, supabase),
  ])
  const { billingAccount, subscription } = billingOverview
  const resolvedCompanyAppSettings = {
    ...defaultCompanyAppSettings,
    ...(companyAppSettings ?? {}),
  }
  const enabledCompanyModuleKeys = new Set(
    (companyModuleRows.filter((row) => row.is_enabled).map((row) => row.module_key) as PlatformModuleKey[]).length > 0
      ? (companyModuleRows.filter((row) => row.is_enabled).map((row) => row.module_key) as PlatformModuleKey[])
      : defaultEnabledPlatformModules,
  )
  const branchAccessMap = new Map<string, string[]>()
  for (const row of companyUserBranchRows) {
    const current = branchAccessMap.get(row.user_id) ?? []
    current.push(row.branch_id)
    branchAccessMap.set(row.user_id, current)
  }
  const authUserMap = await getAuthUserMap([...new Set(membershipRows.map((member) => member.user_id))])
  const linkedUserIds = new Set(driverRows.map((driver) => driver.auth_user_id).filter(Boolean))
  const driverMemberOptions = membershipRows
    .filter((member) => member.role === 'driver' && member.is_active)
    .map((member) => {
      const profile = profileMap.get(member.user_id)
      const authUser = authUserMap.get(member.user_id)
      return {
        user_id: member.user_id,
        label: profile?.full_name ?? authUser?.email ?? member.user_id.slice(0, 8),
        email: authUser?.email ?? null,
      }
    })
  const invitePendingCount = membershipRows.filter((member) => {
    const authLifecycle = getAuthLifecycle(authUserMap.get(member.user_id))
    return member.is_active && authLifecycle.label === 'Invite pending'
  }).length
  const explicitDriverLinkCount = driverRows.filter((driver) => Boolean(driver.auth_user_id)).length
  const billingEnv = getBillingEnv()
  const siteUrlConfigured = Boolean(getServiceRoleEnv().NEXT_PUBLIC_SITE_URL)
  const emailDeliveryConfigured = hasEmailDeliveryConfig()
  const stripeBillingConfigured = hasStripeBillingConfig()
  const stripeWebhookConfigured = hasStripeWebhookConfig()
  const starterPriceConfigured = Boolean(billingEnv.STRIPE_PRICE_STARTER)
  const growthPriceConfigured = Boolean(billingEnv.STRIPE_PRICE_GROWTH)
  const monitoringEnv = getMonitoringEnv()
  const monitoringConfigured = hasSentryConfig()
  const sentrySourceMapsConfigured = hasSentrySourceMapConfig()
  const sentryRelease = monitoringEnv.SENTRY_RELEASE ?? null
  const sentryEnvironment = monitoringEnv.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development'
  const driverLinkCoverage = driverRows.length > 0 ? `${explicitDriverLinkCount}/${driverRows.length}` : '0/0'
  const entityPathMap = {
    customer: 'customers',
    vehicle: 'vehicles',
    driver: 'drivers',
  } as const
  const sectionMeta = settingsSectionMeta[section]
  const duplicateReviewGroups =
    diagnostics.duplicates.customers.length + diagnostics.duplicates.vehicles.length + diagnostics.duplicates.drivers.length
  const overviewCards = [
    {
      section: 'company' as const,
      eyebrow: 'Company',
      metric: `${resolvedCompanyAppSettings.order_prefix}-${resolvedCompanyAppSettings.order_next_number}`,
      detail: 'Details, numbering, invoice terms, and profitability assumptions.',
    },
    {
      section: 'team' as const,
      eyebrow: 'Team',
      metric: `${membershipRows.length} users`,
      detail: `${invitePendingCount} pending invites, ${driverLinkCoverage} driver links.`,
    },
    {
      section: 'billing' as const,
      eyebrow: 'Billing',
      metric: subscription?.plan_key ?? 'No plan',
      detail: stripeWebhookConfigured ? 'Checkout and webhook sync are connected.' : 'Stripe still needs final sync setup.',
    },
    {
      section: 'operations' as const,
      eyebrow: 'Operations',
      metric: monitoringConfigured ? 'Monitoring ready' : 'Monitoring incomplete',
      detail: 'Release checklist, health checks, audit trail, and monitoring controls.',
    },
    {
      section: 'data' as const,
      eyebrow: 'Data',
      metric: `${diagnostics.cleanupQueue.length} cleanup items`,
      detail: `${duplicateReviewGroups} duplicate groups and CSV onboarding tools.`,
    },
  ]

  const duplicateMergeActionMap = {
    customers: mergeCustomerDuplicateAction,
    vehicles: mergeVehicleDuplicateAction,
    drivers: mergeDriverDuplicateAction,
  } as const

  async function updateCompanyAction(formData: FormData) {
    'use server'

    const { supabase, membership } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    await supabase
      .from('companies')
      .update({
        name: getString(formData, 'name'),
        business_id: getOptionalString(formData, 'business_id'),
        vat_number: getOptionalString(formData, 'vat_number'),
        email: getOptionalString(formData, 'email'),
        phone: getOptionalString(formData, 'phone'),
        address_line1: getOptionalString(formData, 'address_line1'),
        address_line2: getOptionalString(formData, 'address_line2'),
        postal_code: getOptionalString(formData, 'postal_code'),
        city: getOptionalString(formData, 'city'),
        country: getOptionalString(formData, 'country') ?? 'FI',
        timezone: getOptionalString(formData, 'timezone') ?? 'Europe/Helsinki',
      })
      .eq('id', membership.company_id)

    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Company details saved.' }))
  }

  async function updateCompanyModulesAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const payload = platformModuleKeys.map((moduleKey) => ({
      company_id: membership.company_id,
      module_key: moduleKey,
      is_enabled: moduleKey === 'core' ? true : getCheckboxValue(formData, `module_${moduleKey}`),
    }))

    const { error: upsertError } = await supabase.from('company_modules').upsert(payload, { onConflict: 'company_id,module_key' })

    if (upsertError) {
      redirect(buildSettingsHref(locale, section, { error: upsertError.message }))
    }

    await insertAuditLog(createSupabaseAdminClient(), {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_modules',
      entity_id: membership.company_id,
      action: 'update_company_modules',
      new_values: {
        enabled_modules: payload.filter((row) => row.is_enabled).map((row) => row.module_key),
      },
    })

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/settings/company`)
    redirect(buildSettingsHref(locale, section, { success: 'Platform modules updated.' }))
  }

  async function createBranchAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const name = getString(formData, 'branch_name')
    if (!name.trim()) {
      redirect(buildSettingsHref(locale, section, { error: 'Branch name is required.' }))
    }

    const payload = {
      company_id: membership.company_id,
      name,
      code: getOptionalString(formData, 'branch_code'),
      branch_type: getOptionalString(formData, 'branch_type') ?? 'branch',
      city: getOptionalString(formData, 'branch_city'),
      country: (getOptionalString(formData, 'branch_country') ?? 'FI').toUpperCase(),
      is_active: true,
    }

    const { data, error: insertError } = await supabase.from('branches').insert(payload).select('*').single()
    const branch = data as DbTableRow<'branches'> | null

    if (insertError || !branch) {
      redirect(buildSettingsHref(locale, section, { error: insertError?.message ?? 'Unable to create branch.' }))
    }

    await insertAuditLog(createSupabaseAdminClient(), {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'branch',
      entity_id: branch.id,
      action: 'create_branch',
      new_values: branch,
    })

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/settings/company`)
    redirect(buildSettingsHref(locale, section, { success: `Branch ${branch.name} created.` }))
  }

  async function updateBranchAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const branchId = getString(formData, 'branch_id')
    const payload = {
      name: getString(formData, 'branch_name'),
      code: getOptionalString(formData, 'branch_code'),
      branch_type: getOptionalString(formData, 'branch_type') ?? 'branch',
      city: getOptionalString(formData, 'branch_city'),
      country: (getOptionalString(formData, 'branch_country') ?? 'FI').toUpperCase(),
      is_active: getCheckboxValue(formData, 'branch_is_active'),
    }

    const { data, error: updateError } = await supabase
      .from('branches')
      .update(payload)
      .eq('id', branchId)
      .eq('company_id', membership.company_id)
      .select('*')
      .single()
    const branch = data as DbTableRow<'branches'> | null

    if (updateError || !branch) {
      redirect(buildSettingsHref(locale, section, { error: updateError?.message ?? 'Unable to update branch.' }))
    }

    await insertAuditLog(createSupabaseAdminClient(), {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'branch',
      entity_id: branch.id,
      action: 'update_branch',
      new_values: branch,
    })

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/settings/company`)
    redirect(buildSettingsHref(locale, section, { success: `Branch ${branch.name} updated.` }))
  }

  async function inviteTeamMemberAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const email = normalizeEmail(getString(formData, 'email'))
    const fullName = getOptionalString(formData, 'full_name') ?? email
    const role = parseRole(getString(formData, 'role'))
    const createDriverProfile = getCheckboxValue(formData, 'create_driver_profile')
    const createAccountWithoutEmail = getCheckboxValue(formData, 'create_account_without_email')
    const generateInviteLink = getCheckboxValue(formData, 'generate_invite_link')
    const temporaryPassword = getOptionalString(formData, 'temporary_password')
    const phone = getOptionalString(formData, 'driver_phone')
    const licenseType = getOptionalString(formData, 'driver_license_type')
    const employmentType = getOptionalString(formData, 'driver_employment_type')

    if (!email) {
      redirect(buildSettingsHref(locale, section, { error: 'Email is required.' }))
    }

    if (role === 'owner' && membership.role !== 'owner') {
      redirect(buildSettingsHref(locale, section, { error: 'Only an owner can invite another owner.' }))
    }

    const admin = createSupabaseAdminClient()
    const env = getServiceRoleEnv()
    const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/${locale}/login`
    const existingUser = await findAuthUserByEmail(email)
    let targetUser: SupabaseUser | null = existingUser
    let wasInvited = false
    let wasCreatedManually = false
    let inviteLinkPayload: InviteLinkPayload | null = null

    if (!targetUser) {
      if (createAccountWithoutEmail) {
        if (!temporaryPassword || temporaryPassword.length < 8) {
          redirect(buildSettingsHref(locale, section, { error: 'Temporary password must be at least 8 characters for manual account creation.' }))
        }

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        })

        if (error || !data.user) {
          redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to create user account.' }))
        }

        targetUser = data.user
        wasCreatedManually = true
      } else {
        if (generateInviteLink) {
          const { data, error } = await admin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
              redirectTo,
              data: {
                full_name: fullName,
              },
            },
          })

          if (error || !data.user || !data.properties?.action_link) {
            redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to generate invite link.' }))
          }

          targetUser = data.user
          inviteLinkPayload = {
            email,
            actionLink: data.properties.action_link,
            generatedAt: new Date().toISOString(),
          }
        } else {
          const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo,
            data: {
              full_name: fullName,
            },
          })

          if (error || !data.user) {
            redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to invite user.' }))
          }

          targetUser = data.user
          wasInvited = true
        }
      }
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: targetUser.id,
        full_name: fullName,
        phone: phone ?? null,
      },
      { onConflict: 'id' },
    )

    if (profileError) {
      redirect(buildSettingsHref(locale, section, { error: profileError.message }))
    }

    const membershipResponse = await admin
      .from('company_users')
      .upsert(
        {
          company_id: membership.company_id,
          user_id: targetUser.id,
          role,
          is_active: true,
        },
        { onConflict: 'company_id,user_id' },
      )
      .select('*')
      .single()
    const membershipRow = membershipResponse.data as DbTableRow<'company_users'> | null
    const membershipError = membershipResponse.error

    if (membershipError || !membershipRow) {
      redirect(buildSettingsHref(locale, section, { error: membershipError?.message ?? 'Unable to save company membership.' }))
    }

    let driverAuditValues: DbTableRow<'drivers'> | null = null
    if (role === 'driver' && createDriverProfile) {
      const { data: linkedDriver } = await admin
        .from('drivers')
        .select('*')
        .eq('company_id', membership.company_id)
        .eq('auth_user_id', targetUser.id)
        .maybeSingle()

      const { data: emailDriver } =
        linkedDriver || !email
          ? { data: null }
          : await admin.from('drivers').select('*').eq('company_id', membership.company_id).eq('email', email).maybeSingle()

      const { data: namedDriver } =
        linkedDriver || emailDriver || !fullName
          ? { data: null }
          : await admin.from('drivers').select('*').eq('company_id', membership.company_id).eq('full_name', fullName).maybeSingle()

      const existingDriver = (linkedDriver ?? emailDriver ?? namedDriver) as DbTableRow<'drivers'> | null

      if (existingDriver) {
        const { data: updatedDriver, error: driverUpdateError } = await admin
          .from('drivers')
          .update({
            auth_user_id: targetUser.id,
            email,
            phone: phone ?? existingDriver.phone,
            license_type: licenseType ?? existingDriver.license_type,
            employment_type: employmentType ?? existingDriver.employment_type,
            is_active: true,
          })
          .eq('id', existingDriver.id)
          .select('*')
          .single()

        if (driverUpdateError) {
          redirect(buildSettingsHref(locale, section, { error: driverUpdateError.message }))
        }

        driverAuditValues = updatedDriver as DbTableRow<'drivers'>
      } else {
        const { data: createdDriver, error: driverInsertError } = await admin
          .from('drivers')
          .insert({
            company_id: membership.company_id,
            auth_user_id: targetUser.id,
            full_name: fullName,
            email,
            phone: phone ?? null,
            license_type: licenseType ?? null,
            employment_type: employmentType ?? null,
            is_active: true,
          })
          .select('*')
          .single()

        if (driverInsertError) {
          redirect(buildSettingsHref(locale, section, { error: driverInsertError.message }))
        }

        driverAuditValues = createdDriver as DbTableRow<'drivers'>
      }
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: membershipRow.id,
      action: wasCreatedManually ? 'create_team_user' : wasInvited ? 'invite_team_member' : 'upsert_team_membership',
      new_values: membershipRow,
    })

    if (driverAuditValues) {
      await insertAuditLog(admin, {
        company_id: membership.company_id,
        user_id: user.id,
        entity_type: 'driver',
        entity_id: driverAuditValues.id,
        action: 'link_driver_auth_user',
        new_values: driverAuditValues,
      })
    }

    if (generateInviteLink && targetUser?.email && !inviteLinkPayload && !targetUser.last_sign_in_at && !targetUser.email_confirmed_at) {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email: targetUser.email,
        options: {
          redirectTo,
          data: {
            full_name: fullName,
          },
        },
      })

      if (error || !data.properties?.action_link) {
        redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to generate invite link.' }))
      }

      inviteLinkPayload = {
        email: targetUser.email,
        actionLink: data.properties.action_link,
        generatedAt: new Date().toISOString(),
      }

      await insertAuditLog(admin, {
        company_id: membership.company_id,
        user_id: user.id,
        entity_type: 'company_user',
        entity_id: membershipRow.id,
        action: 'generate_team_invite_link',
        new_values: membershipRow,
      })
    }

    if (inviteLinkPayload) {
      await setInviteLinkCookie(inviteLinkPayload)
    } else {
      await clearInviteLinkCookie()
    }

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/drivers`)
    redirect(
      buildSettingsHref(locale, section, {
        success: wasCreatedManually
          ? 'User created and membership assigned. Share the temporary password securely.'
          : inviteLinkPayload
            ? 'Invite link generated and membership created.'
          : wasInvited
            ? 'Invitation sent and membership created.'
            : 'Membership created or updated.',
      }),
    )
  }

  async function updateMembershipAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const targetUserId = getString(formData, 'target_user_id')
    const nextRole = parseRole(getString(formData, 'role'))
    const isActive = getString(formData, 'status') === 'active'

    const admin = createSupabaseAdminClient()
    const currentMembershipResponse = await admin
      .from('company_users')
      .select('*')
      .eq('company_id', membership.company_id)
      .eq('user_id', targetUserId)
      .maybeSingle()
    const currentMembership = currentMembershipResponse.data as DbTableRow<'company_users'> | null

    if (!currentMembership) {
      redirect(buildSettingsHref(locale, section, { error: 'Membership not found.' }))
    }

    if (membership.role !== 'owner' && (currentMembership.role === 'owner' || nextRole === 'owner')) {
      redirect(buildSettingsHref(locale, section, { error: 'Only an owner can change owner memberships.' }))
    }

    if (targetUserId === user.id && !isActive) {
      redirect(buildSettingsHref(locale, section, { error: 'You cannot deactivate your own active membership.' }))
    }

    if (currentMembership.role === 'owner' && (!isActive || nextRole !== 'owner')) {
      const { count } = await admin
        .from('company_users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', membership.company_id)
        .eq('role', 'owner')
        .eq('is_active', true)
        .neq('user_id', targetUserId)

      if (!count || count < 1) {
        redirect(buildSettingsHref(locale, section, { error: 'At least one active owner must remain in the company.' }))
      }
    }

    const updatedMembershipResponse = await admin
      .from('company_users')
      .update({
        role: nextRole,
        is_active: isActive,
      })
      .eq('company_id', membership.company_id)
      .eq('user_id', targetUserId)
      .select('*')
      .single()
    const updatedMembership = updatedMembershipResponse.data as DbTableRow<'company_users'> | null
    const updateError = updatedMembershipResponse.error

    if (updateError || !updatedMembership) {
      redirect(buildSettingsHref(locale, section, { error: updateError?.message ?? 'Unable to update membership.' }))
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: updatedMembership.id,
      action: 'update_membership',
      old_values: currentMembership,
      new_values: updatedMembership,
    })

    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Membership updated.' }))
  }

  async function updateDriverLinkAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const driverId = getString(formData, 'driver_id')
    const authUserId = getOptionalString(formData, 'auth_user_id')
    const admin = createSupabaseAdminClient()

    const [{ data: currentDriver }, { data: selectedMembership }] = await Promise.all([
      admin.from('drivers').select('*').eq('company_id', membership.company_id).eq('id', driverId).maybeSingle(),
      authUserId
        ? admin
            .from('company_users')
            .select('user_id, role, is_active')
            .eq('company_id', membership.company_id)
            .eq('user_id', authUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const typedDriver = currentDriver as DbTableRow<'drivers'> | null
    if (!typedDriver) {
      redirect(buildSettingsHref(locale, section, { error: 'Driver row not found.' }))
    }

    if (authUserId && (!selectedMembership || !selectedMembership.is_active || selectedMembership.role !== 'driver')) {
      redirect(buildSettingsHref(locale, section, { error: 'Only active company users with the driver role can be linked.' }))
    }

    const { data: updatedDriver, error: updateError } = await admin
      .from('drivers')
      .update({ auth_user_id: authUserId ?? null })
      .eq('company_id', membership.company_id)
      .eq('id', driverId)
      .select('*')
      .single()

    if (updateError || !updatedDriver) {
      redirect(buildSettingsHref(locale, section, { error: updateError?.message ?? 'Unable to update driver link.' }))
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'driver',
      entity_id: driverId,
      action: authUserId ? 'link_auth_user' : 'clear_auth_user_link',
      old_values: typedDriver,
      new_values: updatedDriver,
    })

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/drivers`)
    redirect(buildSettingsHref(locale, section, { success: authUserId ? 'Driver login linked.' : 'Driver login link cleared.' }))
  }

  async function autoLinkDriversAction() {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const admin = createSupabaseAdminClient()
    const [membershipResponse, profileResponse, driverResponse] = await Promise.all([
      admin
        .from('company_users')
        .select('user_id, role, is_active')
        .eq('company_id', membership.company_id)
        .eq('role', 'driver')
        .eq('is_active', true),
      admin.from('profiles').select('id, full_name'),
      admin.from('drivers').select('*').eq('company_id', membership.company_id).eq('is_active', true).order('full_name'),
    ])

    const driverMemberships = (membershipResponse.data ?? []) as Array<Pick<DbTableRow<'company_users'>, 'user_id' | 'role' | 'is_active'>>
    const profiles = new Map((profileResponse.data ?? []).map((profile) => [profile.id, profile.full_name?.trim().toLowerCase() ?? null]))
    const authUserMap = await getAuthUserMap(driverMemberships.map((member) => member.user_id))
    const drivers = (driverResponse.data ?? []) as DbTableRow<'drivers'>[]
    const linkedUserIds = new Set(drivers.map((driver) => driver.auth_user_id).filter(Boolean))
    let linked = 0
    let ambiguous = 0
    let skipped = 0

    for (const driver of drivers) {
      if (driver.auth_user_id) {
        continue
      }

      const emailMatches = driver.email
        ? driverMemberships.filter((member) => {
            if (linkedUserIds.has(member.user_id)) return false
            const authUser = authUserMap.get(member.user_id)
            return normalizeEmail(authUser?.email) === normalizeEmail(driver.email)
          })
        : []

      const nameMatches =
        emailMatches.length === 0 && driver.full_name
          ? driverMemberships.filter((member) => {
              if (linkedUserIds.has(member.user_id)) return false
              return profiles.get(member.user_id) === normalizeText(driver.full_name)
            })
          : []

      const candidate = emailMatches.length === 1 ? emailMatches[0] : emailMatches.length === 0 && nameMatches.length === 1 ? nameMatches[0] : null

      if (candidate) {
        const { data: updatedDriver, error: updateError } = await admin
          .from('drivers')
          .update({ auth_user_id: candidate.user_id })
          .eq('company_id', membership.company_id)
          .eq('id', driver.id)
          .select('*')
          .single()

        if (updateError || !updatedDriver) {
          redirect(buildSettingsHref(locale, section, { error: updateError?.message ?? `Auto-link failed for ${driver.full_name}.` }))
        }

        linkedUserIds.add(candidate.user_id)
        linked += 1

        await insertAuditLog(admin, {
          company_id: membership.company_id,
          user_id: user.id,
          entity_type: 'driver',
          entity_id: driver.id,
          action: 'auto_link_auth_user',
          old_values: driver,
          new_values: updatedDriver,
        })

        continue
      }

      if (emailMatches.length > 1 || nameMatches.length > 1) {
        ambiguous += 1
      } else {
        skipped += 1
      }
    }

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/drivers`)
    redirect(
      buildSettingsHref(locale, section, {
        success: `Driver auto-link completed. ${linked} linked, ${ambiguous} ambiguous, ${skipped} unchanged.`,
      }),
    )
  }

  async function resendInviteAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const targetUserId = getString(formData, 'target_user_id')
    const admin = createSupabaseAdminClient()
    const env = getServiceRoleEnv()
    const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/${locale}/login`

    const [{ data: currentMembership }, authUserResponse, profileResponse] = await Promise.all([
      admin.from('company_users').select('*').eq('company_id', membership.company_id).eq('user_id', targetUserId).maybeSingle(),
      admin.auth.admin.getUserById(targetUserId),
      admin.from('profiles').select('full_name').eq('id', targetUserId).maybeSingle(),
    ])

    const typedMembership = currentMembership as DbTableRow<'company_users'> | null
    const authUser = authUserResponse.data.user
    const profile = profileResponse.data as Pick<DbTableRow<'profiles'>, 'full_name'> | null

    if (!typedMembership || !typedMembership.is_active) {
      redirect(buildSettingsHref(locale, section, { error: 'Only active memberships can receive invite emails.' }))
    }

    if (!authUser?.email) {
      redirect(buildSettingsHref(locale, section, { error: 'Auth user email could not be resolved.' }))
    }

    if (authUser.last_sign_in_at || authUser.email_confirmed_at) {
      redirect(buildSettingsHref(locale, section, { error: 'This user already completed account setup. No invite resend is needed.' }))
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(authUser.email, {
      redirectTo,
      data: {
        full_name: profile?.full_name ?? authUser.email,
      },
    })

    if (inviteError) {
      redirect(buildSettingsHref(locale, section, { error: inviteError.message }))
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: typedMembership.id,
      action: 'resend_team_invite',
      new_values: typedMembership,
    })

    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: `Invite resent to ${authUser.email}.` }))
  }

  async function revokeMembershipAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const targetUserId = getString(formData, 'target_user_id')
    const admin = createSupabaseAdminClient()
    const currentMembershipResponse = await admin
      .from('company_users')
      .select('*')
      .eq('company_id', membership.company_id)
      .eq('user_id', targetUserId)
      .maybeSingle()
    const currentMembership = currentMembershipResponse.data as DbTableRow<'company_users'> | null

    if (!currentMembership) {
      redirect(buildSettingsHref(locale, section, { error: 'Membership not found.' }))
    }

    if (membership.role !== 'owner' && currentMembership.role === 'owner') {
      redirect(buildSettingsHref(locale, section, { error: 'Only an owner can revoke another owner.' }))
    }

    if (targetUserId === user.id) {
      redirect(buildSettingsHref(locale, section, { error: 'You cannot revoke your own active membership.' }))
    }

    if (currentMembership.role === 'owner' && currentMembership.is_active) {
      const { count } = await admin
        .from('company_users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', membership.company_id)
        .eq('role', 'owner')
        .eq('is_active', true)
        .neq('user_id', targetUserId)

      if (!count || count < 1) {
        redirect(buildSettingsHref(locale, section, { error: 'At least one active owner must remain in the company.' }))
      }
    }

    const updatedMembershipResponse = await admin
      .from('company_users')
      .update({
        is_active: false,
      })
      .eq('company_id', membership.company_id)
      .eq('user_id', targetUserId)
      .select('*')
      .single()
    const updatedMembership = updatedMembershipResponse.data as DbTableRow<'company_users'> | null

    if (updatedMembershipResponse.error || !updatedMembership) {
      redirect(buildSettingsHref(locale, section, { error: updatedMembershipResponse.error?.message ?? 'Unable to revoke membership.' }))
    }

    const linkedDriversResponse = await admin
      .from('drivers')
      .select('*')
      .eq('company_id', membership.company_id)
      .eq('auth_user_id', targetUserId)
    const linkedDrivers = (linkedDriversResponse.data ?? []) as DbTableRow<'drivers'>[]

    if (linkedDrivers.length > 0) {
      await admin.from('drivers').update({ auth_user_id: null }).eq('company_id', membership.company_id).eq('auth_user_id', targetUserId)
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: updatedMembership.id,
      action: 'revoke_membership_access',
      old_values: currentMembership,
      new_values: updatedMembership,
    })

    for (const linkedDriver of linkedDrivers) {
      await insertAuditLog(admin, {
        company_id: membership.company_id,
        user_id: user.id,
        entity_type: 'driver',
        entity_id: linkedDriver.id,
        action: 'clear_auth_user_link',
        old_values: linkedDriver,
        new_values: {
          ...linkedDriver,
          auth_user_id: null,
        },
      })
    }

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/drivers`)
    redirect(buildSettingsHref(locale, section, { success: 'Membership access revoked.' }))
  }

  async function generateInviteLinkAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const targetUserId = getString(formData, 'target_user_id')
    const admin = createSupabaseAdminClient()
    const env = getServiceRoleEnv()
    const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/${locale}/login`

    const [{ data: currentMembership }, authUserResponse, profileResponse] = await Promise.all([
      admin.from('company_users').select('*').eq('company_id', membership.company_id).eq('user_id', targetUserId).maybeSingle(),
      admin.auth.admin.getUserById(targetUserId),
      admin.from('profiles').select('full_name').eq('id', targetUserId).maybeSingle(),
    ])

    const typedMembership = currentMembership as DbTableRow<'company_users'> | null
    const authUser = authUserResponse.data.user
    const profile = profileResponse.data as Pick<DbTableRow<'profiles'>, 'full_name'> | null

    if (!typedMembership || !typedMembership.is_active) {
      redirect(buildSettingsHref(locale, section, { error: 'Only active memberships can receive invite links.' }))
    }

    if (!authUser?.email) {
      redirect(buildSettingsHref(locale, section, { error: 'Auth user email could not be resolved.' }))
    }

    if (authUser.last_sign_in_at || authUser.email_confirmed_at) {
      redirect(buildSettingsHref(locale, section, { error: 'This user already completed account setup. No invite link is needed.' }))
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: authUser.email,
      options: {
        redirectTo,
        data: {
          full_name: profile?.full_name ?? authUser.email,
        },
      },
    })

    if (error || !data.properties?.action_link) {
      redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to generate invite link.' }))
    }

    await setInviteLinkCookie({
      email: authUser.email,
      actionLink: data.properties.action_link,
      generatedAt: new Date().toISOString(),
    })

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: typedMembership.id,
      action: 'generate_team_invite_link',
      new_values: typedMembership,
    })

    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: `Invite link generated for ${authUser.email}.` }))
  }

  async function clearInviteLinkAction() {
    'use server'

    await clearInviteLinkCookie()
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section))
  }

  async function updateBranchAccessAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const targetUserId = getString(formData, 'target_user_id')
    const selectedBranchIds = formData
      .getAll('branch_ids')
      .filter((value): value is string => typeof value === 'string' && value.length > 0)

    const { error: deleteError } = await supabase
      .from('company_user_branches')
      .delete()
      .eq('company_id', membership.company_id)
      .eq('user_id', targetUserId)

    if (deleteError) {
      redirect(buildSettingsHref(locale, section, { error: deleteError.message }))
    }

    if (selectedBranchIds.length > 0) {
      const rows = selectedBranchIds.map((branchId) => ({
        company_id: membership.company_id,
        user_id: targetUserId,
        branch_id: branchId,
      }))
      const { error: insertError } = await supabase.from('company_user_branches').insert(rows)

      if (insertError) {
        redirect(buildSettingsHref(locale, section, { error: insertError.message }))
      }
    }

    await insertAuditLog(createSupabaseAdminClient(), {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user_branches',
      entity_id: null,
      action: 'update_branch_access',
      new_values: {
        target_user_id: targetUserId,
        branch_ids: selectedBranchIds,
      },
    })

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/settings/team`)
    redirect(buildSettingsHref(locale, section, { success: 'Branch access updated.' }))
  }

  async function startBillingCheckoutAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const planKey = getString(formData, 'plan_key')
    if (!isBillablePlanKey(planKey)) {
      redirect(buildSettingsHref(locale, section, { error: 'Unsupported billing plan.' }))
    }

    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', membership.company_id)
      .single()

    if (companyError || !companyRecord) {
      redirect(buildSettingsHref(locale, section, { error: companyError?.message ?? 'Company details could not be loaded.' }))
    }

    let checkoutUrl: string

    try {
      checkoutUrl = await createBillingCheckoutSession({
        company: companyRecord as DbTableRow<'companies'>,
        userEmail: user.email ?? null,
        locale,
        planKey,
        returnPath: buildSettingsHref(locale, 'billing'),
      })

      await insertAuditLog(createSupabaseAdminClient(), {
        company_id: membership.company_id,
        user_id: user.id,
        entity_type: 'company_subscription',
        entity_id: null,
        action: 'start_billing_checkout',
        new_values: { plan_key: planKey },
      })
    } catch (error) {
      redirect(buildSettingsHref(locale, section, { error: error instanceof Error ? error.message : 'Stripe checkout could not be created.' }))
    }

    redirect(checkoutUrl)
  }

  async function openBillingPortalAction() {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', membership.company_id)
      .single()

    if (companyError || !companyRecord) {
      redirect(buildSettingsHref(locale, section, { error: companyError?.message ?? 'Company details could not be loaded.' }))
    }

    let portalUrl: string

    try {
      portalUrl = await createBillingPortalSession({
        company: companyRecord as DbTableRow<'companies'>,
        locale,
        returnPath: buildSettingsHref(locale, 'billing'),
      })

      await insertAuditLog(createSupabaseAdminClient(), {
        company_id: membership.company_id,
        user_id: user.id,
        entity_type: 'company_subscription',
        entity_id: null,
        action: 'open_billing_portal',
      })
    } catch (error) {
      redirect(buildSettingsHref(locale, section, { error: error instanceof Error ? error.message : 'Stripe billing portal could not be opened.' }))
    }

    redirect(portalUrl)
  }

  async function updateCompanyAppSettingsAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const parsed = companyAppSettingsSchema.safeParse({
      order_prefix: getString(formData, 'order_prefix').toUpperCase(),
      order_next_number: getString(formData, 'order_next_number'),
      invoice_prefix: getString(formData, 'invoice_prefix').toUpperCase(),
      invoice_next_number: getString(formData, 'invoice_next_number'),
      default_payment_terms_days: getString(formData, 'default_payment_terms_days'),
      default_vat_rate: getString(formData, 'default_vat_rate'),
      fuel_cost_per_km: getString(formData, 'fuel_cost_per_km'),
      maintenance_cost_per_km: getString(formData, 'maintenance_cost_per_km'),
      driver_cost_per_hour: getString(formData, 'driver_cost_per_hour'),
      waiting_cost_per_hour: getString(formData, 'waiting_cost_per_hour'),
      default_currency: getString(formData, 'default_currency').toUpperCase(),
      invoice_footer: getOptionalString(formData, 'invoice_footer'),
      brand_accent: getString(formData, 'brand_accent'),
    })

    if (!parsed.success) {
      redirect(buildSettingsHref(locale, section, { error: parsed.error.issues[0]?.message ?? 'Invalid company settings.' }))
    }

    const previous = await getCompanyAppSettings(membership.company_id, supabase)
    const { data, error } = await supabase
      .from('company_app_settings')
      .upsert(
        {
          company_id: membership.company_id,
          ...parsed.data,
        },
        { onConflict: 'company_id' },
      )
      .select('*')
      .single()

    if (error || !data) {
      redirect(buildSettingsHref(locale, section, { error: error?.message ?? 'Unable to save company configuration.' }))
    }

    await insertAuditLog(supabase, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_app_settings',
      entity_id: membership.company_id,
      action: 'update',
      old_values: previous,
      new_values: data,
    })

    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Company configuration saved.' }))
  }

  async function importCustomersCsvAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'Select a customer CSV file first.' }))
    }

    const rows = parseCsvRecords(await file.text())
    if (rows.length === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'The customer CSV file was empty.' }))
    }

    let branchQuery = supabase.from('branches').select('id, code, name').eq('company_id', membership.company_id).eq('is_active', true)
    if (membership.branchIds.length > 0) {
      branchQuery = branchQuery.in('id', membership.branchIds)
    }

    let existingQuery = supabase.from('customers').select('*').eq('company_id', membership.company_id)
    if (membership.branchIds.length > 0) {
      existingQuery = existingQuery.in('branch_id', membership.branchIds)
    }

    const [{ data: branchRowsForImport, error: branchError }, { data: existingRows, error: existingError }] = await Promise.all([
      branchQuery,
      existingQuery,
    ])
    if (branchError) {
      redirect(buildSettingsHref(locale, section, { error: branchError.message }))
    }
    if (existingError) {
      redirect(buildSettingsHref(locale, section, { error: existingError.message }))
    }

    const importBranches = (branchRowsForImport ?? []) as CsvImportBranch[]
    const existingCustomers = [...((existingRows as DbTableRow<'customers'>[] | null) ?? [])]
    let created = 0
    let updated = 0
    for (const row of rows) {
      const parsed = customerSchema.safeParse({
        branch_id: (() => {
          try {
            return resolveImportedBranchId(row, importBranches, membership)
          } catch (branchResolutionError) {
            redirect(buildSettingsHref(locale, section, { error: `Customer import failed for "${row.name || 'unknown row'}": ${branchResolutionError instanceof Error ? branchResolutionError.message : 'Invalid branch.'}` }))
          }
        })(),
        name: row.name,
        email: row.email,
        business_id: row.business_id,
        vat_number: row.vat_number,
        phone: row.phone,
        billing_address_line1: row.billing_address_line1,
        billing_address_line2: row.billing_address_line2,
        billing_postal_code: row.billing_postal_code,
        billing_city: row.billing_city,
        billing_country: row.billing_country,
        notes: row.notes,
      })

      if (!parsed.success) {
        redirect(buildSettingsHref(locale, section, { error: `Customer import failed for "${row.name || 'unknown row'}": ${parsed.error.issues[0]?.message ?? 'Invalid row.'}` }))
      }

      const match =
        existingCustomers.find((customer) => parsed.data.business_id && customer.business_id === parsed.data.business_id) ??
        existingCustomers.find((customer) => normalizeText(customer.name) === normalizeText(parsed.data.name))

      if (match) {
        await updateCustomer(membership.company_id, user.id, match.id, parsed.data, membership, supabase)
        updated += 1
      } else {
        const createdRow = await createCustomer(membership.company_id, user.id, parsed.data, membership, supabase)
        existingCustomers.push(createdRow)
        created += 1
      }
    }

    revalidatePath(`/${locale}/customers`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: `Customer import completed. ${created} created, ${updated} updated.` }))
  }

  async function importVehiclesCsvAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'Select a vehicle CSV file first.' }))
    }

    const rows = parseCsvRecords(await file.text())
    if (rows.length === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'The vehicle CSV file was empty.' }))
    }

    let branchQuery = supabase.from('branches').select('id, code, name').eq('company_id', membership.company_id).eq('is_active', true)
    if (membership.branchIds.length > 0) {
      branchQuery = branchQuery.in('id', membership.branchIds)
    }

    let existingQuery = supabase.from('vehicles').select('*').eq('company_id', membership.company_id)
    if (membership.branchIds.length > 0) {
      existingQuery = existingQuery.in('branch_id', membership.branchIds)
    }

    const [{ data: branchRowsForImport, error: branchError }, { data: existingRows, error: existingError }] = await Promise.all([
      branchQuery,
      existingQuery,
    ])
    if (branchError) {
      redirect(buildSettingsHref(locale, section, { error: branchError.message }))
    }
    if (existingError) {
      redirect(buildSettingsHref(locale, section, { error: existingError.message }))
    }

    const importBranches = (branchRowsForImport ?? []) as CsvImportBranch[]
    const existingVehicles = [...((existingRows as DbTableRow<'vehicles'>[] | null) ?? [])]
    let created = 0
    let updated = 0
    for (const row of rows) {
      const parsed = vehicleSchema.safeParse({
        branch_id: (() => {
          try {
            return resolveImportedBranchId(row, importBranches, membership)
          } catch (branchResolutionError) {
            redirect(buildSettingsHref(locale, section, { error: `Vehicle import failed for "${row.registration_number || 'unknown row'}": ${branchResolutionError instanceof Error ? branchResolutionError.message : 'Invalid branch.'}` }))
          }
        })(),
        registration_number: row.registration_number,
        make: row.make,
        model: row.model,
        year: row.year,
        fuel_type: row.fuel_type,
        current_km: row.current_km,
        next_service_km: row.next_service_km,
        is_active: parseCsvBoolean(row.is_active, true),
      })

      if (!parsed.success) {
        redirect(buildSettingsHref(locale, section, { error: `Vehicle import failed for "${row.registration_number || 'unknown row'}": ${parsed.error.issues[0]?.message ?? 'Invalid row.'}` }))
      }

      const match = existingVehicles.find(
        (vehicle) => normalizeText(vehicle.registration_number) === normalizeText(parsed.data.registration_number),
      )

      if (match) {
        await updateVehicle(membership.company_id, user.id, match.id, parsed.data, membership, supabase)
        updated += 1
      } else {
        const createdRow = await createVehicle(membership.company_id, user.id, parsed.data, membership, supabase)
        existingVehicles.push(createdRow)
        created += 1
      }
    }

    revalidatePath(`/${locale}/vehicles`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: `Vehicle import completed. ${created} created, ${updated} updated.` }))
  }

  async function importDriversCsvAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'Select a driver CSV file first.' }))
    }

    const rows = parseCsvRecords(await file.text())
    if (rows.length === 0) {
      redirect(buildSettingsHref(locale, section, { error: 'The driver CSV file was empty.' }))
    }

    let branchQuery = supabase.from('branches').select('id, code, name').eq('company_id', membership.company_id).eq('is_active', true)
    if (membership.branchIds.length > 0) {
      branchQuery = branchQuery.in('id', membership.branchIds)
    }

    let existingQuery = supabase.from('drivers').select('*').eq('company_id', membership.company_id)
    if (membership.branchIds.length > 0) {
      existingQuery = existingQuery.in('branch_id', membership.branchIds)
    }

    const [{ data: branchRowsForImport, error: branchError }, { data: existingRows, error: existingError }] = await Promise.all([
      branchQuery,
      existingQuery,
    ])
    if (branchError) {
      redirect(buildSettingsHref(locale, section, { error: branchError.message }))
    }
    if (existingError) {
      redirect(buildSettingsHref(locale, section, { error: existingError.message }))
    }

    const importBranches = (branchRowsForImport ?? []) as CsvImportBranch[]
    const existingDrivers = [...((existingRows as DbTableRow<'drivers'>[] | null) ?? [])]
    let created = 0
    let updated = 0
    for (const row of rows) {
      const parsed = driverSchema.safeParse({
        branch_id: (() => {
          try {
            return resolveImportedBranchId(row, importBranches, membership)
          } catch (branchResolutionError) {
            redirect(buildSettingsHref(locale, section, { error: `Driver import failed for "${row.full_name || 'unknown row'}": ${branchResolutionError instanceof Error ? branchResolutionError.message : 'Invalid branch.'}` }))
          }
        })(),
        full_name: row.full_name,
        phone: row.phone,
        email: row.email,
        license_type: row.license_type,
        employment_type: row.employment_type,
        is_active: parseCsvBoolean(row.is_active, true),
      })

      if (!parsed.success) {
        redirect(buildSettingsHref(locale, section, { error: `Driver import failed for "${row.full_name || 'unknown row'}": ${parsed.error.issues[0]?.message ?? 'Invalid row.'}` }))
      }

      const match =
        existingDrivers.find((driver) => parsed.data.email && normalizeEmail(driver.email) === normalizeEmail(parsed.data.email)) ??
        existingDrivers.find((driver) => normalizeText(driver.full_name) === normalizeText(parsed.data.full_name))

      if (match) {
        await updateDriver(membership.company_id, user.id, match.id, parsed.data, membership, supabase)
        updated += 1
      } else {
        const createdRow = await createDriver(membership.company_id, user.id, parsed.data, membership, supabase)
        existingDrivers.push(createdRow)
        created += 1
      }
    }

    revalidatePath(`/${locale}/drivers`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: `Driver import completed. ${created} created, ${updated} updated.` }))
  }

  async function mergeCustomerDuplicateAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    try {
      await mergeCustomerDuplicate(
        membership.company_id,
        user.id,
        getString(formData, 'target_id'),
        getString(formData, 'source_id'),
        supabase,
      )
    } catch (error) {
      redirect(buildSettingsHref(locale, section, { error: error instanceof Error ? error.message : 'Customer merge failed.' }))
    }

    revalidatePath(`/${locale}/customers`)
    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/trips`)
    revalidatePath(`/${locale}/invoices`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Customer duplicate merged.' }))
  }

  async function mergeVehicleDuplicateAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    try {
      await mergeVehicleDuplicate(
        membership.company_id,
        user.id,
        getString(formData, 'target_id'),
        getString(formData, 'source_id'),
        supabase,
      )
    } catch (error) {
      redirect(buildSettingsHref(locale, section, { error: error instanceof Error ? error.message : 'Vehicle merge failed.' }))
    }

    revalidatePath(`/${locale}/vehicles`)
    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/trips`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Vehicle duplicate merged.' }))
  }

  async function mergeDriverDuplicateAction(formData: FormData) {
    'use server'

    const { membership, user, supabase } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, section, { error: 'Insufficient permissions.' }))
    }

    try {
      await mergeDriverDuplicate(
        membership.company_id,
        user.id,
        getString(formData, 'target_id'),
        getString(formData, 'source_id'),
        supabase,
      )
    } catch (error) {
      redirect(buildSettingsHref(locale, section, { error: error instanceof Error ? error.message : 'Driver merge failed.' }))
    }

    revalidatePath(`/${locale}/drivers`)
    revalidatePath(`/${locale}/orders`)
    revalidatePath(`/${locale}/trips`)
    revalidatePath(`/${locale}/settings`)
    redirect(buildSettingsHref(locale, section, { success: 'Driver duplicate merged.' }))
  }

  return (
    <div className="space-y-8">
      <PageHeader title={sectionMeta.title} description={sectionMeta.description} />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(settingsSectionMeta) as Array<[SettingsSection, (typeof settingsSectionMeta)[SettingsSection]]>).map(([key, meta]) => (
          <Button
            key={key}
            asChild
            variant={section === key ? 'default' : 'outline'}
            className={section === key ? 'bg-slate-950 text-white hover:bg-slate-900' : undefined}
          >
            <Link href={buildSettingsHref(locale, key)}>{key === 'overview' ? 'Overview' : meta.title.replace(' Settings', '')}</Link>
          </Button>
        ))}
      </div>

      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{success}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">{error}</div> : null}
      {section === 'team' && inviteLinkData ? (
        <InviteLinkPanel email={inviteLinkData.email} inviteLink={inviteLinkData.actionLink} generatedAt={inviteLinkData.generatedAt} clearAction={clearInviteLinkAction} />
      ) : null}

      {section === 'overview' ? (
        <>
          <div className="grid gap-4 xl:grid-cols-5">
            {overviewCards.map((card) => (
              <Link
                key={card.section}
                href={buildSettingsHref(locale, card.section)}
                className="rounded-3xl border p-5 transition hover:border-sky-200 hover:shadow-sm"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{card.eyebrow}</div>
                <div className="mt-3 text-lg font-semibold text-foreground">{card.metric}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.detail}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card >
              <CardHeader>
                <CardTitle>Rollout Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Stripe billing</span>
                  <Badge variant={stripeBillingConfigured && stripeWebhookConfigured ? 'success' : 'warning'}>
                    {stripeBillingConfigured && stripeWebhookConfigured ? 'Ready' : 'Needs review'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Invoice email delivery</span>
                  <Badge variant={emailDeliveryConfigured ? 'success' : 'warning'}>{emailDeliveryConfigured ? 'Ready' : 'Fallback only'}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Sentry monitoring</span>
                  <Badge variant={monitoringConfigured ? 'success' : 'warning'}>{monitoringConfigured ? 'Ready' : 'Incomplete'}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card >
              <CardHeader>
                <CardTitle>Data Hygiene</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Cleanup queue</span>
                  <Badge variant={diagnostics.cleanupQueue.length === 0 ? 'success' : 'warning'}>{diagnostics.cleanupQueue.length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Duplicate review groups</span>
                  <Badge variant={duplicateReviewGroups === 0 ? 'success' : 'warning'}>{duplicateReviewGroups}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span>Drivers without explicit auth link</span>
                  <Badge variant={diagnostics.quality.activeDriversUnlinked === 0 ? 'success' : 'warning'}>
                    {diagnostics.quality.activeDriversUnlinked}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card >
              <CardHeader>
                <CardTitle>Recommended Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Keep company defaults current before changing invoice numbering or pricing logic.</p>
                <p>2. Use Team to invite staff and verify explicit driver login links before handing out mobile access.</p>
                <p>3. Use Data to import master data and clear duplicate or incomplete records before go-live.</p>
                <p>4. Use Operations to verify health, monitoring, and audit activity before each release.</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {section === 'company' ? <form action={updateCompanyAction}>
        <Card >
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" name="name" defaultValue={companyData.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_id">Business ID</Label>
              <Input id="business_id" name="business_id" defaultValue={companyData.business_id ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input id="vat_number" name="vat_number" defaultValue={companyData.vat_number ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={companyData.email ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={companyData.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" name="address_line1" defaultValue={companyData.address_line1 ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input id="address_line2" name="address_line2" defaultValue={companyData.address_line2 ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" name="postal_code" defaultValue={companyData.postal_code ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={companyData.city ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={companyData.country} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={companyData.timezone} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save company details</Button>
            </div>
          </CardContent>
        </Card>
      </form> : null}

      {section === 'company' ? <form action={updateCompanyAppSettingsAction}>
        <Card >
          <CardHeader>
            <CardTitle>Company Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="order_prefix">Order Prefix</Label>
              <Input id="order_prefix" name="order_prefix" defaultValue={resolvedCompanyAppSettings.order_prefix} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_next_number">Next Order Number</Label>
              <Input id="order_next_number" name="order_next_number" type="number" min={1} defaultValue={resolvedCompanyAppSettings.order_next_number} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
              <Input id="invoice_prefix" name="invoice_prefix" defaultValue={resolvedCompanyAppSettings.invoice_prefix} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_next_number">Next Invoice Number</Label>
              <Input id="invoice_next_number" name="invoice_next_number" type="number" min={1} defaultValue={resolvedCompanyAppSettings.invoice_next_number} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_payment_terms_days">Default Payment Terms (days)</Label>
              <Input
                id="default_payment_terms_days"
                name="default_payment_terms_days"
                type="number"
                min={0}
                defaultValue={resolvedCompanyAppSettings.default_payment_terms_days}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_vat_rate">Default VAT Rate</Label>
              <Input id="default_vat_rate" name="default_vat_rate" type="number" step="0.01" min={0} defaultValue={resolvedCompanyAppSettings.default_vat_rate} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_currency">Currency</Label>
              <Input id="default_currency" name="default_currency" maxLength={3} defaultValue={resolvedCompanyAppSettings.default_currency} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_cost_per_km">Fuel Cost per KM</Label>
              <Input
                id="fuel_cost_per_km"
                name="fuel_cost_per_km"
                type="number"
                step="0.01"
                min={0}
                defaultValue={resolvedCompanyAppSettings.fuel_cost_per_km}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance_cost_per_km">Maintenance Cost per KM</Label>
              <Input
                id="maintenance_cost_per_km"
                name="maintenance_cost_per_km"
                type="number"
                step="0.01"
                min={0}
                defaultValue={resolvedCompanyAppSettings.maintenance_cost_per_km}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_cost_per_hour">Driver Cost per Hour</Label>
              <Input
                id="driver_cost_per_hour"
                name="driver_cost_per_hour"
                type="number"
                step="0.01"
                min={0}
                defaultValue={resolvedCompanyAppSettings.driver_cost_per_hour}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waiting_cost_per_hour">Waiting Cost per Hour</Label>
              <Input
                id="waiting_cost_per_hour"
                name="waiting_cost_per_hour"
                type="number"
                step="0.01"
                min={0}
                defaultValue={resolvedCompanyAppSettings.waiting_cost_per_hour}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand_accent">Brand Accent</Label>
              <div className="flex gap-3">
                <Input id="brand_accent" name="brand_accent" type="color" defaultValue={resolvedCompanyAppSettings.brand_accent} className="h-11 w-24 p-1" />
                <Input defaultValue={resolvedCompanyAppSettings.brand_accent} readOnly className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="invoice_footer">Invoice Footer</Label>
              <textarea
                id="invoice_footer"
                name="invoice_footer"
                defaultValue={resolvedCompanyAppSettings.invoice_footer ?? ''}
                className="min-h-28 w-full rounded-lg border border-border/20 bg-white px-4 py-3 text-sm text-foreground"
                placeholder="Payment instructions, legal note, or dispatch contact details."
              />
            </div>
            <div className="md:col-span-2 rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
              Profitability reporting uses the cost assumptions above to estimate trip, vehicle, driver, and customer margin. Keep them directional and review them before using the reports for pricing decisions.
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-border/20 bg-surface px-4 py-3 text-sm text-muted-foreground">
              <span>Order numbering, invoice terms, and estimated profitability reports all use these company defaults automatically.</span>
              <Button type="submit">Save company configuration</Button>
            </div>
          </CardContent>
        </Card>
      </form> : null}

      {section === 'company' ? <form action={updateCompanyModulesAction}>
        <Card >
          <CardHeader>
            <CardTitle>Platform Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
              Enable only the parts of the platform this client actually needs. Transport can stay focused while inventory, purchasing, time, payroll, or accounting are turned on later.
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {platformModuleDefinitions.map((moduleDefinition) => (
                <label key={moduleDefinition.key} className="flex gap-3 rounded-2xl border border-border/20 px-4 py-4">
                  <input
                    type="checkbox"
                    name={`module_${moduleDefinition.key}`}
                    value="true"
                    defaultChecked={enabledCompanyModuleKeys.has(moduleDefinition.key)}
                    disabled={moduleDefinition.alwaysEnabled}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{moduleDefinition.label}</span>
                      {moduleDefinition.alwaysEnabled ? <Badge variant="default">Always on</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{moduleDefinition.description}</p>
                    <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                      {moduleDefinition.routeModules.join(' / ')}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save module entitlements</Button>
            </div>
          </CardContent>
        </Card>
      </form> : null}

      {section === 'company' ? <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card >
          <CardHeader>
            <CardTitle>Branches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
              Branches let you tailor access for depots, terminals, warehouses, or business units without spinning up another app instance.
            </div>
            {branchRows.length > 0 ? (
              <div className="space-y-3">
                {branchRows.map((branch) => (
                  <form key={branch.id} action={updateBranchAction} className="grid gap-3 rounded-2xl border border-border/20 px-4 py-4 md:grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_auto]">
                    <input type="hidden" name="branch_id" value={branch.id} />
                    <div className="space-y-2">
                      <Label htmlFor={`branch_name_${branch.id}`}>Name</Label>
                      <Input id={`branch_name_${branch.id}`} name="branch_name" defaultValue={branch.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`branch_code_${branch.id}`}>Code</Label>
                      <Input id={`branch_code_${branch.id}`} name="branch_code" defaultValue={branch.code ?? ''} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`branch_type_${branch.id}`}>Type</Label>
                      <Input id={`branch_type_${branch.id}`} name="branch_type" defaultValue={branch.branch_type} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`branch_city_${branch.id}`}>City</Label>
                      <Input id={`branch_city_${branch.id}`} name="branch_city" defaultValue={branch.city ?? ''} />
                    </div>
                    <div className="flex items-end gap-3">
                      <label className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <input type="checkbox" name="branch_is_active" value="true" defaultChecked={branch.is_active} className="h-4 w-4 rounded border-slate-300" />
                        Active
                      </label>
                      <input type="hidden" name="branch_country" value={branch.country} />
                      <Button type="submit" variant="outline">Save</Button>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No branches created yet. Keep a single workspace if the client does not operate by branch, depot, terminal, or warehouse.</div>
            )}
          </CardContent>
        </Card>

        <form action={createBranchAction}>
          <Card >
            <CardHeader>
              <CardTitle>Add Branch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch_name">Name</Label>
                <Input id="branch_name" name="branch_name" placeholder="Helsinki Terminal" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch_code">Code</Label>
                  <Input id="branch_code" name="branch_code" placeholder="HEL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_type">Type</Label>
                  <Input id="branch_type" name="branch_type" placeholder="terminal" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branch_city">City</Label>
                  <Input id="branch_city" name="branch_city" placeholder="Helsinki" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_country">Country</Label>
                  <Input id="branch_country" name="branch_country" defaultValue="FI" />
                </div>
              </div>
              <Button type="submit">Create branch</Button>
            </CardContent>
          </Card>
        </form>
      </div> : null}

      {section === 'data' ? <CsvOnboardingPanel
        customerAction={importCustomersCsvAction}
        vehicleAction={importVehiclesCsvAction}
        driverAction={importDriversCsvAction}
        existingCustomers={customerRows.map((customer) => ({
          primary: customer.name,
          secondary: customer.business_id,
          tertiary: customer.email,
        }))}
        existingVehicles={vehicleRows.map((vehicle) => ({
          primary: vehicle.registration_number,
        }))}
        existingDrivers={driverRows.map((driver) => ({
          primary: driver.full_name,
          secondary: driver.email,
          tertiary: driver.phone,
        }))}
        availableBranches={branchRows.map((branch) => ({
          code: branch.code,
          name: branch.name,
        }))}
      /> : null}

      {section === 'team' ? <form action={inviteTeamMemberAction}>
        <Card >
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invite_email">Email</Label>
              <Input id="invite_email" name="email" type="email" placeholder="driver@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite_full_name">Full Name</Label>
              <Input id="invite_full_name" name="full_name" placeholder="Mika Lehtinen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite_role">Role</Label>
              <select id="invite_role" name="role" defaultValue="viewer" className="h-11 w-full rounded-lg border border-border/20 bg-white px-3 text-sm text-foreground">
                {companyRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_phone">Driver Phone</Label>
              <Input id="driver_phone" name="driver_phone" placeholder="+358401234567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_license_type">Driver License Type</Label>
              <Input id="driver_license_type" name="driver_license_type" placeholder="CE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver_employment_type">Driver Employment Type</Label>
              <Input id="driver_employment_type" name="driver_employment_type" placeholder="Full-time" />
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <input id="create_driver_profile" name="create_driver_profile" type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
              <div className="space-y-1">
                <Label htmlFor="create_driver_profile">Create or link a driver profile</Label>
                <p className="text-sm text-muted-foreground">Use this when inviting a user with the <code>driver</code> role so mobile access works without SQL.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <input id="create_account_without_email" name="create_account_without_email" type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
              <div className="space-y-1">
                <Label htmlFor="create_account_without_email">Create account without sending an email invite</Label>
                <p className="text-sm text-muted-foreground">
                  Use this fallback if SMTP or Supabase Auth invite delivery is not configured yet. The user will be created immediately.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 md:col-span-2">
              <input id="generate_invite_link" name="generate_invite_link" type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" />
              <div className="space-y-1">
                <Label htmlFor="generate_invite_link">Generate a manual invite link instead of sending an email</Label>
                <p className="text-sm text-muted-foreground">
                  Use this when you want to copy the secure invite URL and deliver it yourself through WhatsApp, SMS, or your own email channel.
                </p>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="temporary_password">Temporary Password</Label>
              <Input id="temporary_password" name="temporary_password" type="password" placeholder="Required only for manual account creation" />
              <p className="text-sm text-muted-foreground">Minimum 8 characters. Share it through a secure channel and ask the user to change it after first sign-in.</p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Invite team member</Button>
            </div>
          </CardContent>
        </Card>
      </form> : null}

      {section === 'team' ? <Card >
        <CardHeader>
          <CardTitle>Team Memberships</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipRows.map((member) => {
                const profile = profileMap.get(member.user_id)
                const authUser = authUserMap.get(member.user_id)
                const authLifecycle = getAuthLifecycle(authUser)
                const ownerProtected = membership.role !== 'owner' && member.role === 'owner'
                const revokeProtected = member.user_id === user.id
                const showResend = member.is_active && authLifecycle.canResendInvite && !ownerProtected
                const showRevoke = member.is_active && !ownerProtected && !revokeProtected

                return (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{profile?.full_name ?? member.user_id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{authUser?.email ?? 'No auth email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'success' : 'default'}>{member.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant={authLifecycle.variant}>{authLifecycle.label}</Badge>
                        <div className="text-xs text-muted-foreground">{authLifecycle.detail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ownerProtected ? (
                        <Badge variant="warning">Owner-only change</Badge>
                      ) : (
                        <div className="space-y-3">
                          <form action={updateMembershipAction} className="flex min-w-[20rem] flex-col gap-2 md:flex-row">
                            <input type="hidden" name="target_user_id" value={member.user_id} />
                            <select name="role" defaultValue={member.role} className="h-11 rounded-lg border border-border/20 bg-white px-3 text-sm text-foreground">
                              {companyRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <select name="status" defaultValue={member.is_active ? 'active' : 'inactive'} className="h-11 rounded-lg border border-border/20 bg-white px-3 text-sm text-foreground">
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <Button type="submit" variant="outline">Save</Button>
                          </form>
                          <div className="flex flex-wrap gap-2">
                            {showResend ? (
                              <form action={resendInviteAction}>
                                <input type="hidden" name="target_user_id" value={member.user_id} />
                                <Button type="submit" variant="outline">Resend invite</Button>
                              </form>
                            ) : null}
                            {showResend ? (
                              <form action={generateInviteLinkAction}>
                                <input type="hidden" name="target_user_id" value={member.user_id} />
                                <Button type="submit" variant="outline">Generate link</Button>
                              </form>
                            ) : null}
                            {showRevoke ? (
                              <form action={revokeMembershipAction}>
                                <input type="hidden" name="target_user_id" value={member.user_id} />
                                <Button type="submit" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">
                                  Revoke access
                                </Button>
                              </form>
                            ) : revokeProtected ? (
                              <Badge variant="default">Current session</Badge>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card> : null}

      {section === 'team' ? <Card >
        <CardHeader>
          <CardTitle>Driver Login Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Link each driver row to an active company user with the <code>driver</code> role. The app now prefers this explicit
            <code> drivers.auth_user_id </code>
            link for mobile access and driver-scoped RLS.
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/20 bg-surface px-4 py-3 text-sm text-muted-foreground">
            <span>
              Use auto-link to match unlinked active drivers to active company users with the <code>driver</code> role by exact email first, then unique full-name fallback.
            </span>
            <form action={autoLinkDriversAction}>
              <Button type="submit" variant="outline" disabled={driverMemberOptions.length === 0}>
                Auto-link drivers
              </Button>
            </form>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Current Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assign Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverRows.map((driver) => {
                const linkedMember = driver.auth_user_id ? membershipRows.find((member) => member.user_id === driver.auth_user_id) ?? null : null
                const linkedProfile = linkedMember ? profileMap.get(linkedMember.user_id) : null
                const linkedAuthUser = driver.auth_user_id ? authUserMap.get(driver.auth_user_id) : null
                const fallbackMatch =
                  driverMemberOptions.find(
                    (member) =>
                      (!!driver.email && !!member.email && driver.email.toLowerCase() === member.email.toLowerCase()) ||
                      (!!driver.full_name && driver.full_name.toLowerCase() === member.label.toLowerCase()),
                  ) ?? null
                const availableOptions = driverMemberOptions.filter(
                  (memberOption) => memberOption.user_id === driver.auth_user_id || !linkedUserIds.has(memberOption.user_id),
                )

                return (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{driver.full_name}</div>
                        <div className="text-xs text-muted-foreground">{driver.email ?? 'No driver email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {linkedMember ? (
                        <div className="space-y-1">
                          <div>{linkedProfile?.full_name ?? linkedMember.user_id.slice(0, 8)}</div>
                          <div className="text-xs text-muted-foreground">{linkedAuthUser?.email ?? 'No auth email'}</div>
                        </div>
                      ) : fallbackMatch ? (
                        <div className="space-y-1">
                          <div>{fallbackMatch.label}</div>
                          <div className="text-xs text-muted-foreground">{fallbackMatch.email ?? 'Suggested from fallback match'}</div>
                        </div>
                      ) : (
                        'Not linked'
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.auth_user_id ? (
                        <Badge variant="success">Explicit link</Badge>
                      ) : fallbackMatch ? (
                        <Badge variant="warning">Fallback only</Badge>
                      ) : (
                        <Badge variant="default">Unlinked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <form action={updateDriverLinkAction} className="flex min-w-[18rem] flex-col gap-2 md:flex-row">
                        <input type="hidden" name="driver_id" value={driver.id} />
                        <select
                          name="auth_user_id"
                          defaultValue={driver.auth_user_id ?? ''}
                          className="h-11 rounded-lg border border-border/20 bg-white px-3 text-sm text-foreground"
                        >
                          <option value="">No linked login</option>
                          {availableOptions.map((memberOption) => (
                            <option key={memberOption.user_id} value={memberOption.user_id}>
                              {memberOption.label}{memberOption.email ? ` (${memberOption.email})` : ''}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" variant="outline">Save link</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {driverRows.length === 0 ? <div className="text-sm text-muted-foreground">No driver rows yet.</div> : null}
          {driverMemberOptions.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              No active company users with the driver role are available to link yet.
            </div>
          ) : null}
        </CardContent>
      </Card> : null}

      {section === 'team' ? <Card >
        <CardHeader>
          <CardTitle>Branch Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
            Leave branch access empty for a user to keep full-company visibility. Assign one or more branches when a client wants branch-specific access for depots, warehouses, or terminals.
          </div>
          {branchRows.length > 0 ? (
            <div className="space-y-4">
              {membershipRows.map((member) => {
                const assignedBranchIds = new Set(branchAccessMap.get(member.user_id) ?? [])
                const authUser = authUserMap.get(member.user_id)
                const profile = profileMap.get(member.user_id)

                return (
                  <form key={`branch-access-${member.user_id}`} action={updateBranchAccessAction} className="rounded-2xl border border-border/20 px-4 py-4">
                    <input type="hidden" name="target_user_id" value={member.user_id} />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{profile?.full_name ?? authUser?.email ?? member.user_id.slice(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">{authUser?.email ?? 'No auth email'} · {member.role}</div>
                      </div>
                      <Badge variant={assignedBranchIds.size === 0 ? 'default' : 'success'}>
                        {assignedBranchIds.size === 0 ? 'All branches' : `${assignedBranchIds.size} assigned`}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {branchRows.map((branch) => (
                        <label key={`${member.user_id}-${branch.id}`} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            name="branch_ids"
                            value={branch.id}
                            defaultChecked={assignedBranchIds.has(branch.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <div>
                            <div className="font-medium text-foreground">{branch.name}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{branch.branch_type}{branch.city ? ` · ${branch.city}` : ''}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button type="submit" variant="outline">Save branch scope</Button>
                    </div>
                  </form>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">
              Create branches in Company Settings before assigning branch access to users.
            </div>
          )}
        </CardContent>
      </Card> : null}

      {section === 'billing' ? <Card >
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current plan</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">{subscription?.plan_key ?? 'No plan yet'}</span>
                <Badge variant={getSubscriptionBadgeVariant(subscription?.status)}>{subscription?.status ?? 'unconfigured'}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Renewal window</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatDateTime(subscription?.current_period_end ?? null)}</div>
            </div>
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stripe customer</div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {billingAccount?.stripe_customer_id ? `${billingAccount.stripe_customer_id.slice(0, 16)}...` : 'Not linked'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Seats</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{subscription?.seats ?? 0}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <form action={openBillingPortalAction}>
              <Button type="submit" variant="outline" disabled={!stripeBillingConfigured || !billingAccount}>
                Open Stripe billing portal
              </Button>
            </form>
            {!stripeBillingConfigured ? (
              <Badge variant="warning">Add Stripe env vars before checkout or portal access.</Badge>
            ) : null}
            {stripeBillingConfigured && !stripeWebhookConfigured ? (
              <Badge variant="warning">Webhook secret missing, subscription sync is incomplete.</Badge>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {billingPlans.map((plan) => {
              const isCurrent = subscription?.plan_key === plan.key
              const canLaunchCheckout =
                !plan.requiresContact &&
                stripeBillingConfigured &&
                stripeWebhookConfigured &&
                ((plan.key === 'starter' && starterPriceConfigured) || (plan.key === 'growth' && growthPriceConfigured))

              return (
                <div key={plan.key} className="rounded-3xl border border-border/20 bg-surface/80 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-foreground">{plan.name}</div>
                      <div className="text-sm text-muted-foreground">{plan.monthlyPriceLabel}</div>
                    </div>
                    {isCurrent ? <Badge variant="success">Current</Badge> : null}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {plan.highlights.map((highlight) => (
                      <div key={highlight}>• {highlight}</div>
                    ))}
                  </div>
                  {plan.requiresContact ? (
                    <div className="mt-5 rounded-2xl border border-border/20 bg-white px-4 py-3 text-sm text-muted-foreground">
                      Use this tier as a founder-led sales motion after the first live pilots.
                    </div>
                  ) : (
                    <form action={startBillingCheckoutAction} className="mt-5">
                      <input type="hidden" name="plan_key" value={plan.key} />
                      <Button type="submit" className="w-full" disabled={!canLaunchCheckout || isCurrent}>
                        {isCurrent ? 'Current plan' : plan.ctaLabel}
                      </Button>
                    </form>
                  )}
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Billing sync notes</div>
            <div className="mt-2 space-y-2">
              <p>Stripe checkout launches from this page, then the webhook at <code>/api/stripe/webhook</code> syncs the live subscription state back into Supabase.</p>
              <p>Starter and Growth need valid recurring Stripe prices. Enterprise stays founder-led for now and should be sold manually until plan controls are fully productized.</p>
            </div>
          </div>
        </CardContent>
      </Card> : null}

      {section === 'operations' ? <div className="grid gap-6 xl:grid-cols-2">
        <Card >
          <CardHeader>
            <CardTitle>Operational Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Site URL configured</span>
              <Badge variant={siteUrlConfigured ? 'success' : 'warning'}>{siteUrlConfigured ? 'Ready' : 'Missing'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>SMTP invoice delivery</span>
              <Badge variant={emailDeliveryConfigured ? 'success' : 'warning'}>{emailDeliveryConfigured ? 'Ready' : 'Manual fallback only'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Stripe billing</span>
              <Badge variant={stripeBillingConfigured ? 'success' : 'warning'}>{stripeBillingConfigured ? 'Ready' : 'Missing secret key'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Stripe webhook sync</span>
              <Badge variant={stripeWebhookConfigured ? 'success' : 'warning'}>{stripeWebhookConfigured ? 'Ready' : 'Missing webhook secret'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Sentry monitoring</span>
              <Badge variant={monitoringConfigured ? 'success' : 'warning'}>{monitoringConfigured ? 'Ready' : 'Missing DSN'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Sentry release tag</span>
              <Badge variant={sentryRelease ? 'success' : 'warning'}>{sentryRelease ?? 'Missing'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Sentry source maps</span>
              <Badge variant={sentrySourceMapsConfigured ? 'success' : 'default'}>{sentrySourceMapsConfigured ? 'Ready' : 'Optional'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Active pending invites</span>
              <Badge variant={invitePendingCount === 0 ? 'success' : 'warning'}>{invitePendingCount}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Driver auth links</span>
              <Badge variant={driverRows.length === 0 || explicitDriverLinkCount === driverRows.length ? 'success' : 'warning'}>{driverLinkCoverage}</Badge>
            </div>
            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-3">
              <div className="font-medium text-foreground">Health endpoint</div>
              <div className="mt-1 text-muted-foreground">
                Use <a href="/api/health" target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-4">/api/health</a> for deployment checks and basic database/email readiness visibility.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Release Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Run `npm run type-check` and `npm test` locally before every release.</p>
            <p>2. Run `npm run build` to confirm the production bundle and route generation are clean.</p>
            <p>3. Run `npm run test:e2e` with `PLAYWRIGHT_EMAIL` and `PLAYWRIGHT_PASSWORD` against the target Supabase project.</p>
            <p>4. Verify `/api/health`, invoice email delivery, Stripe checkout/webhook sync, and a driver mobile trip update in the staging or production-like environment.</p>
            <p>5. Push schema changes via `npx supabase db push` and keep manual SQL editor use limited to one-off recovery tasks.</p>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>App Configuration Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>This MVP enforces authenticated dashboard access, company-aware data filtering, and starter role checks.</p>
            <p>Driver access now prefers an explicit auth link on the driver row. Email and full-name matching are fallback only for existing data migration.</p>
            <p>Settings now supports team invite status, invite resends, access revocation, and manual account creation fallback when invite email delivery is not ready.</p>
          </CardContent>
        </Card>
        <Card >
          <CardHeader>
            <CardTitle>Monitoring Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span><code>NEXT_PUBLIC_SENTRY_DSN</code></span>
              <Badge variant={monitoringConfigured ? 'success' : 'warning'}>{monitoringConfigured ? 'Configured' : 'Missing'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span><code>SENTRY_ENVIRONMENT</code></span>
              <Badge variant="default">{sentryEnvironment}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span><code>SENTRY_RELEASE</code></span>
              <Badge variant={sentryRelease ? 'success' : 'warning'}>{sentryRelease ?? 'Missing'}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3">
              <span>Source map upload envs</span>
              <Badge variant={sentrySourceMapsConfigured ? 'success' : 'default'}>{sentrySourceMapsConfigured ? 'Configured' : 'Optional'}</Badge>
            </div>
            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-3">
              <div className="font-medium text-foreground">Deployment checklist</div>
              <div className="mt-2 space-y-2">
                <p>1. Create a Sentry Next.js project and add <code>NEXT_PUBLIC_SENTRY_DSN</code> on the host.</p>
                <p>2. Set <code>SENTRY_ENVIRONMENT</code> and a stable <code>SENTRY_RELEASE</code> for each deploy.</p>
                <p>3. Add <code>SENTRY_ORG</code>, <code>SENTRY_PROJECT</code>, and <code>SENTRY_AUTH_TOKEN</code> if you want source maps uploaded during build.</p>
                <p>4. Deploy, then use the monitoring test controls below to confirm server and browser event delivery.</p>
                <p>5. Create issue alert rules in Sentry. Event ingestion alone does not notify anyone.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card >
          <CardHeader>
            <CardTitle>Document Storage Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>The `documents` table is ready for metadata and demo preparation.</p>
            <p>The mobile driver workflow expects a Supabase Storage bucket named `transport-documents` for POD and receipt uploads.</p>
            <p>Signed uploads are now wired for the driver portal, but bucket rules and object-level access policies still need manual completion before production file handling is finished.</p>
          </CardContent>
        </Card>
      </div> : null}

      {section === 'operations' ? <MonitoringTestPanel enabled={monitoringConfigured} /> : null}

      {section === 'data' ? <div className="grid gap-6 xl:grid-cols-2">
        <Card >
          <CardHeader>
            <CardTitle>Tenant Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Customers</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.customers}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Orders</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.orders}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trips</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.trips}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Invoices</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.invoices}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Payments</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.payments}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Documents</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.documents}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Drivers</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.drivers}</div>
              </div>
              <div className="rounded-xl border border-slate-100 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Vehicles</div>
                <div className="mt-1 text-xl font-semibold text-foreground">{diagnostics.counts.vehicles}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4">
              <div className="font-medium text-foreground">Latest activity</div>
              <div className="mt-3 space-y-2">
                <div>Last order: {formatDateTime(diagnostics.recency.lastOrderCreatedAt)}</div>
                <div>Last trip: {formatDateTime(diagnostics.recency.lastTripCreatedAt)}</div>
                <div>Last invoice: {formatDateTime(diagnostics.recency.lastInvoiceCreatedAt)}</div>
                <div>Last payment: {formatDateTime(diagnostics.recency.lastPaymentCreatedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Data Quality Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Customers missing billing email</span>
              <Badge variant={diagnostics.quality.customersMissingEmail === 0 ? 'success' : 'warning'}>{diagnostics.quality.customersMissingEmail}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Active drivers without explicit auth link</span>
              <Badge variant={diagnostics.quality.activeDriversUnlinked === 0 ? 'success' : 'warning'}>{diagnostics.quality.activeDriversUnlinked}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Active drivers missing email</span>
              <Badge variant={diagnostics.quality.activeDriversMissingEmail === 0 ? 'success' : 'warning'}>{diagnostics.quality.activeDriversMissingEmail}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Overdue invoices</span>
              <Badge variant={diagnostics.quality.overdueInvoices === 0 ? 'success' : 'warning'}>{diagnostics.quality.overdueInvoices}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Started trips without assigned driver</span>
              <Badge variant={diagnostics.quality.startedTripsWithoutDriver === 0 ? 'success' : 'warning'}>{diagnostics.quality.startedTripsWithoutDriver}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
              <span>Sent invoices missing stored PDF URL</span>
              <Badge variant={diagnostics.quality.sentInvoicesWithoutPdfUrl === 0 ? 'success' : 'warning'}>{diagnostics.quality.sentInvoicesWithoutPdfUrl}</Badge>
            </div>
          </CardContent>
        </Card>
      </div> : null}

      {section === 'data' ? <div className="grid gap-6 xl:grid-cols-2">
        <Card >
          <CardHeader>
            <CardTitle>Duplicate Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            {([
              { title: 'Customers', rows: diagnostics.duplicates.customers, path: 'customers' },
              { title: 'Vehicles', rows: diagnostics.duplicates.vehicles, path: 'vehicles' },
              { title: 'Drivers', rows: diagnostics.duplicates.drivers, path: 'drivers' },
            ] as const).map((section) => (
              <div key={section.title} className="space-y-3 rounded-2xl border border-border/20 bg-surface px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-foreground">{section.title}</div>
                  <Badge variant={section.rows.length === 0 ? 'success' : 'warning'}>{section.rows.length === 0 ? 'Clear' : `${section.rows.length} review groups`}</Badge>
                </div>
                {section.rows.length > 0 ? (
                  <div className="space-y-3">
                    {section.rows.map((group, index) => {
                      const canonical = group.entries[0]
                      const mergeAction = duplicateMergeActionMap[section.path]

                      return (
                        <div key={`${section.title}-${group.reason}-${group.key}-${index}`} className="rounded-xl border border-border/20 bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-foreground">{group.reason}</div>
                            <div className="text-xs text-muted-foreground">{group.key}</div>
                          </div>
                          <Badge variant="warning">{group.entries.length} records</Badge>
                        </div>
                        <div className="mt-3 space-y-2">
                          {group.entries.map((entry, entryIndex) => (
                            <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">{entry.label}</div>
                                {entry.secondaryLabel ? <div className="truncate text-xs text-muted-foreground">{entry.secondaryLabel}</div> : null}
                              </div>
                              <div className="flex items-center gap-2">
                                {entryIndex === 0 ? (
                                  <Badge variant="success">Keep this record</Badge>
                                ) : (
                                  <form action={mergeAction}>
                                    <input type="hidden" name="target_id" value={canonical.id} />
                                    <input type="hidden" name="source_id" value={entry.id} />
                                    <Button type="submit" variant="outline" size="sm">
                                      Merge into keep
                                    </Button>
                                  </form>
                                )}
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/${locale}/${section.path}/${entry.id}/edit`}>Open record</Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-muted-foreground">No likely duplicate groups detected for this section.</div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card >
          <CardHeader>
            <CardTitle>Cleanup Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/20 bg-surface px-4 py-4">
              Prioritize these records before go-live so onboarding, driver access, and invoice delivery do not degrade into manual cleanup later.
            </div>
            {diagnostics.cleanupQueue.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnostics.cleanupQueue.map((item) => (
                    <TableRow key={`${item.entityType}-${item.id}-${item.issue}`}>
                      <TableCell className="capitalize">{item.entityType}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{item.label}</div>
                        {item.detail ? <div className="text-xs text-muted-foreground">{item.detail}</div> : null}
                      </TableCell>
                      <TableCell>{item.issue}</TableCell>
                      <TableCell>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/${locale}/${entityPathMap[item.entityType]}/${item.id}/edit`}>Fix record</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-8 text-muted-foreground">No cleanup items are currently queued for the core customer, vehicle, and driver datasets.</div>
            )}
          </CardContent>
        </Card>
      </div> : null}

      {section === 'operations' ? <Card >
        <CardHeader>
          <CardTitle>Recent Audit Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentAuditLogs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAuditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDateTime(log.created_at)}</TableCell>
                    <TableCell>{log.actor_name ?? authUserMap.get(log.user_id ?? '')?.email ?? 'System'}</TableCell>
                    <TableCell>{log.entity_type}</TableCell>
                    <TableCell>{log.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No audit events have been recorded yet.</div>
          )}
        </CardContent>
      </Card> : null}
    </div>
  )
}

