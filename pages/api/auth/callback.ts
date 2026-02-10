import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res })
  const code = req.query.code
  const token = req.query.token
  const type = req.query.type
  const redirectAfterAuth = type === 'recovery' ? '/reset-password' : '/confirmed'

  if (typeof code === 'string') {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return res.redirect('/login?error=auth_callback')
    }
    return res.redirect(redirectAfterAuth)
  }

  if (typeof token === 'string' && typeof type === 'string') {
    const otpType = type as 'signup' | 'recovery' | 'invite' | 'magiclink' | 'email_change'
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: otpType,
    })
    if (error) {
      return res.redirect('/login?error=auth_callback')
    }
    return res.redirect(redirectAfterAuth)
  }

  return res.redirect('/login?error=missing_code')
}
