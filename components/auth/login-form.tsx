'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const supabase = createSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('auth.login')}</CardTitle>
        <CardDescription>{t('common.appName')}</CardDescription>
      </CardHeader>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setIsLoading(true)
          const form = new FormData(e.currentTarget)
          const email = String(form.get('email') ?? '')
          const password = String(form.get('password') ?? '')

          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          setIsLoading(false)

          if (signInError) {
            setError(t('errors.unauthorized'))
            return
          }

          window.location.href = `/${locale}/dashboard`
        }}
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" name="email" type="email" required data-testid="login-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input id="password" name="password" type="password" required data-testid="login-password" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3">
          <Link href="/signup" className="text-sm text-muted-foreground hover:underline">
            {t('auth.signup')}
          </Link>
          <Button type="submit" disabled={isLoading} data-testid="login-submit">
            {t('auth.signIn')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
