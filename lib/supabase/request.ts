import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'
import { publicEnv } from '@/lib/env/public'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export async function createSupabaseRequestClient(accessToken?: string | null) {
  if (!accessToken) {
    return createSupabaseRouteClient()
  }

  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
