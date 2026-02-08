import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export const getSupabaseBrowser = (): SupabaseClient => {
  if (!browserClient) {
    browserClient = createPagesBrowserClient()
  }
  return browserClient
}
