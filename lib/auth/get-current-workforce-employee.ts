import type { TableRow } from '@/types/database'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getCurrentWorkforceEmployee(companyId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, employee: null as TableRow<'workforce_employees'> | null, supabase }
  }

  const { data, error } = await supabase
    .from('workforce_employees')
    .select('*')
    .eq('company_id', companyId)
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw error
  }

  return {
    user,
    employee: (data as TableRow<'workforce_employees'> | null) ?? null,
    supabase,
  }
}
