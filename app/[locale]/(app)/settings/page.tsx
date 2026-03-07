import type { User as SupabaseUser } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canManageSettings } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import { insertAuditLog } from '@/lib/db/shared'
import { getServiceRoleEnv } from '@/lib/env/service-role'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { TableRow as DbTableRow } from '@/types/database'
import { companyRoles, type CompanyRole } from '@/types/app'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'

type MembershipRow = {
  user_id: string
  role: string
  is_active: boolean
  created_at: string
}

function buildSettingsHref(locale: string, extras?: Record<string, string>) {
  const params = new URLSearchParams(extras)
  const query = params.toString()
  return `/${locale}/settings${query ? `?${query}` : ''}`
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

function parseRole(value: string): CompanyRole {
  if (companyRoles.includes(value as CompanyRole)) {
    return value as CompanyRole
  }

  throw new Error('Invalid company role.')
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

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const { locale } = await params
  const { success, error } = await searchParams
  const { supabase, membership, user } = await requireCompany(locale)

  const [company, memberships, profiles, drivers] = await Promise.all([
    supabase.from('companies').select('*').eq('id', membership.company_id).single(),
    supabase.from('company_users').select('user_id, role, is_active, created_at').eq('company_id', membership.company_id).order('created_at'),
    supabase.from('profiles').select('id, full_name, phone'),
    supabase.from('drivers').select('*').eq('company_id', membership.company_id).order('full_name'),
  ])
  const companyData = company.data as DbTableRow<'companies'> | null
  if (!companyData) return null

  const membershipRows = (memberships.data ?? []) as MembershipRow[]
  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]))
  const driverRows = (drivers.data ?? []) as DbTableRow<'drivers'>[]
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

  async function updateCompanyAction(formData: FormData) {
    'use server'

    const { supabase, membership } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, { error: 'Insufficient permissions.' }))
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
    redirect(buildSettingsHref(locale, { success: 'Company details saved.' }))
  }

  async function inviteTeamMemberAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, { error: 'Insufficient permissions.' }))
    }

    const email = normalizeEmail(getString(formData, 'email'))
    const fullName = getOptionalString(formData, 'full_name') ?? email
    const role = parseRole(getString(formData, 'role'))
    const createDriverProfile = getCheckboxValue(formData, 'create_driver_profile')
    const phone = getOptionalString(formData, 'driver_phone')
    const licenseType = getOptionalString(formData, 'driver_license_type')
    const employmentType = getOptionalString(formData, 'driver_employment_type')

    if (!email) {
      redirect(buildSettingsHref(locale, { error: 'Email is required.' }))
    }

    if (role === 'owner' && membership.role !== 'owner') {
      redirect(buildSettingsHref(locale, { error: 'Only an owner can invite another owner.' }))
    }

    const admin = createSupabaseAdminClient()
    const env = getServiceRoleEnv()
    const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const existingUser = await findAuthUserByEmail(email)
    let targetUser: SupabaseUser | null = existingUser
    let wasInvited = false

    if (!targetUser) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl.replace(/\/$/, '')}/${locale}/login`,
        data: {
          full_name: fullName,
        },
      })

      if (error || !data.user) {
        redirect(buildSettingsHref(locale, { error: error?.message ?? 'Unable to invite user.' }))
      }

      targetUser = data.user
      wasInvited = true
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
      redirect(buildSettingsHref(locale, { error: profileError.message }))
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
      redirect(buildSettingsHref(locale, { error: membershipError?.message ?? 'Unable to save company membership.' }))
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
          redirect(buildSettingsHref(locale, { error: driverUpdateError.message }))
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
          redirect(buildSettingsHref(locale, { error: driverInsertError.message }))
        }

        driverAuditValues = createdDriver as DbTableRow<'drivers'>
      }
    }

    await insertAuditLog(admin, {
      company_id: membership.company_id,
      user_id: user.id,
      entity_type: 'company_user',
      entity_id: membershipRow.id,
      action: wasInvited ? 'invite_team_member' : 'upsert_team_membership',
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

    revalidatePath(`/${locale}/settings`)
    revalidatePath(`/${locale}/drivers`)
    redirect(buildSettingsHref(locale, { success: wasInvited ? 'Invitation sent and membership created.' : 'Membership created or updated.' }))
  }

  async function updateMembershipAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, { error: 'Insufficient permissions.' }))
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
      redirect(buildSettingsHref(locale, { error: 'Membership not found.' }))
    }

    if (membership.role !== 'owner' && (currentMembership.role === 'owner' || nextRole === 'owner')) {
      redirect(buildSettingsHref(locale, { error: 'Only an owner can change owner memberships.' }))
    }

    if (targetUserId === user.id && !isActive) {
      redirect(buildSettingsHref(locale, { error: 'You cannot deactivate your own active membership.' }))
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
        redirect(buildSettingsHref(locale, { error: 'At least one active owner must remain in the company.' }))
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
      redirect(buildSettingsHref(locale, { error: updateError?.message ?? 'Unable to update membership.' }))
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
    redirect(buildSettingsHref(locale, { success: 'Membership updated.' }))
  }

  async function updateDriverLinkAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) {
      redirect(buildSettingsHref(locale, { error: 'Insufficient permissions.' }))
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
      redirect(buildSettingsHref(locale, { error: 'Driver row not found.' }))
    }

    if (authUserId && (!selectedMembership || !selectedMembership.is_active || selectedMembership.role !== 'driver')) {
      redirect(buildSettingsHref(locale, { error: 'Only active company users with the driver role can be linked.' }))
    }

    const { data: updatedDriver, error: updateError } = await admin
      .from('drivers')
      .update({ auth_user_id: authUserId ?? null })
      .eq('company_id', membership.company_id)
      .eq('id', driverId)
      .select('*')
      .single()

    if (updateError || !updatedDriver) {
      redirect(buildSettingsHref(locale, { error: updateError?.message ?? 'Unable to update driver link.' }))
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
    redirect(buildSettingsHref(locale, { success: authUserId ? 'Driver login linked.' : 'Driver login link cleared.' }))
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Company configuration, team administration, and implementation notes for secure rollout." />

      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">{success}</div> : null}
      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950">{error}</div> : null}

      <form action={updateCompanyAction}>
        <Card className="border-slate-200/80 bg-white/90">
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
      </form>

      <form action={inviteTeamMemberAction}>
        <Card className="border-slate-200/80 bg-white/90">
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
              <select id="invite_role" name="role" defaultValue="viewer" className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
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
                <p className="text-sm text-slate-500">Use this when inviting a user with the <code>driver</code> role so mobile access works without SQL.</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Invite team member</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-slate-200/80 bg-white/90">
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
                <TableHead>Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipRows.map((member) => {
                const profile = profileMap.get(member.user_id)
                const authUser = authUserMap.get(member.user_id)
                const ownerProtected = membership.role !== 'owner' && member.role === 'owner'

                return (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{profile?.full_name ?? member.user_id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-500">{authUser?.email ?? 'No auth email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{member.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>
                      {ownerProtected ? (
                        <Badge variant="warning">Owner-only change</Badge>
                      ) : (
                        <form action={updateMembershipAction} className="flex min-w-[20rem] flex-col gap-2 md:flex-row">
                          <input type="hidden" name="target_user_id" value={member.user_id} />
                          <select name="role" defaultValue={member.role} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                            {companyRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                          <select name="status" defaultValue={member.is_active ? 'active' : 'inactive'} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          <Button type="submit" variant="outline">Save</Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Driver Login Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-slate-600">
            Link each driver row to an active company user with the <code>driver</code> role. The app now prefers this explicit
            <code> drivers.auth_user_id </code>
            link for mobile access and driver-scoped RLS.
          </p>
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
                        <div className="font-medium text-slate-900">{driver.full_name}</div>
                        <div className="text-xs text-slate-500">{driver.email ?? 'No driver email'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {linkedMember ? (
                        <div className="space-y-1">
                          <div>{linkedProfile?.full_name ?? linkedMember.user_id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-500">{linkedAuthUser?.email ?? 'No auth email'}</div>
                        </div>
                      ) : fallbackMatch ? (
                        <div className="space-y-1">
                          <div>{fallbackMatch.label}</div>
                          <div className="text-xs text-slate-500">{fallbackMatch.email ?? 'Suggested from fallback match'}</div>
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
                          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
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
          {driverRows.length === 0 ? <div className="text-sm text-slate-500">No driver rows yet.</div> : null}
          {driverMemberOptions.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              No active company users with the driver role are available to link yet.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>App Configuration Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>This MVP enforces authenticated dashboard access, company-aware data filtering, and starter role checks.</p>
            <p>Driver access now prefers an explicit auth link on the driver row. Email and full-name matching are fallback only for existing data migration.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Document Storage Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>The `documents` table is ready for metadata and demo preparation.</p>
            <p>The mobile driver workflow expects a Supabase Storage bucket named `transport-documents` for POD and receipt uploads.</p>
            <p>Signed uploads are now wired for the driver portal, but bucket rules and object-level access policies still need manual completion before production file handling is finished.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
