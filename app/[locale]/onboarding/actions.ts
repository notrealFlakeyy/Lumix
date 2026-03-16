'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOnboardingBundleModules, normalizeEnabledPlatformModules } from '@/lib/platform/modules'
import { companySetupSchema } from '@/lib/validations/company'
import { getOptionalString, getString } from '@/lib/utils/forms'

type ActionState = {
  error: string | null
}

const demoCompanyId = '11111111-1111-1111-1111-111111111111'

function getProfileName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const metadataName = user.user_metadata?.full_name
  return typeof metadataName === 'string' && metadataName.trim().length > 0 ? metadataName.trim() : user.email ?? 'Company Owner'
}

async function requireOnboardingContext(locale: string) {
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
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (membership?.company_id) {
    redirect(`/${locale}/dashboard`)
  }

  return { user }
}

export async function createCompanyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const locale = getString(formData, 'locale') || 'fi'

  try {
    const { user } = await requireOnboardingContext(locale)
    const admin = createSupabaseAdminClient()
    const selectedModules = formData.getAll('enabled_modules').filter((value): value is string => typeof value === 'string')
    const businessType = getOptionalString(formData, 'business_type') ?? 'transport'

    const input = companySetupSchema.parse({
      name: getString(formData, 'name'),
      business_id: getOptionalString(formData, 'business_id'),
      vat_number: getOptionalString(formData, 'vat_number'),
      email: getOptionalString(formData, 'email'),
      phone: getOptionalString(formData, 'phone'),
      city: getOptionalString(formData, 'city'),
      country: getOptionalString(formData, 'country') ?? 'FI',
      timezone: getOptionalString(formData, 'timezone') ?? 'Europe/Helsinki',
      business_type: businessType,
      enabled_modules: selectedModules,
      initial_branch_name: getOptionalString(formData, 'initial_branch_name'),
      initial_branch_code: getOptionalString(formData, 'initial_branch_code'),
    })

    const enabledModules = normalizeEnabledPlatformModules(
      input.enabled_modules?.length ? input.enabled_modules : getOnboardingBundleModules(input.business_type),
    )

    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({
        name: input.name,
        business_id: input.business_id ?? null,
        vat_number: input.vat_number ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        city: input.city ?? null,
        country: input.country,
        timezone: input.timezone,
      })
      .select('id')
      .single()

    if (companyError || !company) {
      throw new Error(companyError?.message ?? 'Unable to create company.')
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        full_name: getProfileName(user),
      },
      { onConflict: 'id' },
    )

    if (profileError) {
      throw new Error(profileError.message)
    }

    const { error: membershipError } = await admin.from('company_users').upsert(
      {
        company_id: company.id,
        user_id: user.id,
        role: 'owner',
        is_active: true,
      },
      { onConflict: 'company_id,user_id' },
    )

    if (membershipError) {
      throw new Error(membershipError.message)
    }

    const { error: modulesError } = await admin.from('company_modules').upsert(
      enabledModules.map((moduleKey) => ({
        company_id: company.id,
        module_key: moduleKey,
        is_enabled: true,
      })),
      { onConflict: 'company_id,module_key' },
    )

    if (modulesError) {
      throw new Error(modulesError.message)
    }

    const initialBranchName = input.initial_branch_name?.trim()
    if (initialBranchName) {
      const { error: branchError } = await admin.from('branches').insert({
        company_id: company.id,
        name: initialBranchName,
        code: input.initial_branch_code?.trim() || null,
        branch_type:
          input.business_type === 'warehouse'
            ? 'warehouse'
            : input.business_type === 'transport'
              ? 'terminal'
              : 'branch',
        city: input.city ?? null,
        country: input.country,
        is_active: true,
      })

      if (branchError) {
        throw new Error(branchError.message)
      }
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to complete company setup.',
    }
  }

  revalidatePath(`/${locale}`)
  redirect(`/${locale}/dashboard`)
}

export async function claimDemoCompanyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const locale = getString(formData, 'locale') || 'fi'

  try {
    const { user } = await requireOnboardingContext(locale)
    const admin = createSupabaseAdminClient()

    const { data: company } = await admin.from('companies').select('id').eq('id', demoCompanyId).maybeSingle()

    if (!company) {
      throw new Error('The seeded demo company was not found. Run the demo seed script first or create a new company below.')
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        full_name: getProfileName(user),
      },
      { onConflict: 'id' },
    )

    if (profileError) {
      throw new Error(profileError.message)
    }

    const { error: membershipError } = await admin.from('company_users').upsert(
      {
        company_id: demoCompanyId,
        user_id: user.id,
        role: 'owner',
        is_active: true,
      },
      { onConflict: 'company_id,user_id' },
    )

    if (membershipError) {
      throw new Error(membershipError.message)
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to join the demo company.',
    }
  }

  revalidatePath(`/${locale}`)
  redirect(`/${locale}/dashboard`)
}
