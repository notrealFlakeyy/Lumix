import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database'
import { publicEnv } from '@/lib/env/public'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server Components cannot set cookies; refresh can be handled in Route Handlers.
      },
    },
  })
}
