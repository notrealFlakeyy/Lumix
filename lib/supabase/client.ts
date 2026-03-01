import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/supabase'
import { publicEnv } from '@/lib/env/public'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return browserClient
}
