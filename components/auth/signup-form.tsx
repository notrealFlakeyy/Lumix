'use client'

import * as React from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPortalConfigFromPublicEnv, getPortalPlansUrl } from '@/lib/urls/portal'

export function SignupForm({ locale }: { locale: string }) {
  const supabase = createSupabaseBrowserClient()
  const portalOptions = getPortalConfigFromPublicEnv()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  if (done) {
    return (
      <div
        className="rounded-xl px-5 py-5 text-sm leading-relaxed"
        style={{
          background: 'rgba(var(--app-accent-2), 0.18)',
          border: '1px solid rgba(var(--app-accent-2), 0.35)',
          color: 'rgb(var(--app-contrast))',
        }}
      >
        <p className="font-semibold">Check your email</p>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
          We sent a confirmation link to your inbox. Click it to activate your account, then come back to choose your plan.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const form = new FormData(e.currentTarget)
        const email = String(form.get('email') ?? '').trim()
        const password = String(form.get('password') ?? '')
        const confirmPassword = String(form.get('confirm_password') ?? '')

        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          setIsLoading(false)
          return
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters.')
          setIsLoading(false)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: getPortalPlansUrl(locale, {
              ...portalOptions,
              fallbackOrigin: window.location.origin,
            }),
          },
        })

        setIsLoading(false)

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        // If email confirmation is disabled in Supabase, session is created immediately
        if (data.session) {
          window.location.href = getPortalPlansUrl(locale, {
            ...portalOptions,
            fallbackOrigin: window.location.origin,
          })
          return
        }

        // Email confirmation required
        setDone(true)
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="email" style={{ color: 'rgb(var(--app-contrast))' }}>
          Work email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
          style={{ background: 'rgba(var(--app-muted), 0.07)' }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" style={{ color: 'rgb(var(--app-contrast))' }}>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
          style={{ background: 'rgba(var(--app-muted), 0.07)' }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm_password" style={{ color: 'rgb(var(--app-contrast))' }}>
          Confirm password
        </Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat your password"
          style={{ background: 'rgba(var(--app-muted), 0.07)' }}
        />
      </div>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(var(--app-contrast), 0.07)',
            color: 'rgb(var(--app-contrast))',
            border: '1px solid rgba(var(--app-contrast), 0.15)',
          }}
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
