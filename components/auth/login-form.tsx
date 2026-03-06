'use client'

import * as React from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm({ locale }: { locale: string }) {
  const supabase = createSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access the transportation ERP workspace for your company.</CardDescription>
      </CardHeader>
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
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email</Label>
            <Input id="identifier" name="identifier" type="email" required placeholder="name@company.com" data-testid="login-identifier" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required data-testid="login-password" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">First-time users can create or claim a company after signing in.</span>
          <Button type="submit" disabled={isLoading} data-testid="login-submit">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
