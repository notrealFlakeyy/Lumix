'use client'

import * as React from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm({ locale }: { locale: string }) {
  const supabase = createSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)
        const form = new FormData(e.currentTarget)
        const identifier = String(form.get('identifier') ?? '').trim()
        const password = String(form.get('password') ?? '')

        const { error: signInError } = await supabase.auth.signInWithPassword({ email: identifier, password })
        setIsLoading(false)

        if (signInError) {
          setError('Invalid email or password.')
          return
        }

        window.location.href = `/${locale}/dashboard`
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="identifier" style={{ color: 'rgb(var(--app-contrast))' }}>
          Email
        </Label>
        <Input
          id="identifier"
          name="identifier"
          type="email"
          required
          placeholder="name@company.com"
          data-testid="login-identifier"
          style={{ background: 'rgba(var(--app-muted), 0.07)' }}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" style={{ color: 'rgb(var(--app-contrast))' }}>
            Password
          </Label>
          <a
            href={`/${locale}/forgot-password`}
            className="text-xs no-underline hover:underline"
            style={{ color: 'rgb(var(--app-muted))' }}
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          data-testid="login-password"
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

      <Button type="submit" disabled={isLoading} className="w-full" data-testid="login-submit">
        {isLoading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
