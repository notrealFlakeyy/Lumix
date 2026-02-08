import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import type { GetServerSidePropsContext } from 'next'

export const getSupabaseServer = (context: GetServerSidePropsContext) => {
  return createPagesServerClient(context)
}
