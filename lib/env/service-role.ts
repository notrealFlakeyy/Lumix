import 'server-only'

import { serviceRoleEnvSchema } from './schema'

let cached: ReturnType<typeof serviceRoleEnvSchema.parse> | null = null

export function getServiceRoleEnv() {
  if (cached) return cached

  cached = serviceRoleEnvSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })

  return cached
}
