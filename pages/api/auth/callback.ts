import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code

  if (typeof code !== 'string') {
    return res.redirect('/login?error=missing_code')
  }

  const supabase = createPagesServerClient({ req, res })
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return res.redirect('/login?error=auth_callback')
  }

  return res.redirect('/confirmed')
}
