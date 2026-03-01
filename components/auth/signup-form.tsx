'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const supabase = createSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [orgResult, setOrgResult] = React.useState<null | { type: 'success' | 'error'; orgName: string }>(null)

  return (
    <>
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.signup')}</CardTitle>
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
            const orgName = String(form.get('orgName') ?? '')

            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
            if (signUpError) {
              setIsLoading(false)
              setError(t('errors.unexpected'))
              return
            }

            if (!signUpData.session) {
              setIsLoading(false)
              setError(t('errors.unexpected'))
              return
            }

            const createRes = await fetch(`/api/onboarding/create-org`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orgName }),
            })

            setIsLoading(false)

            if (!createRes.ok) {
              setOrgResult({ type: 'error', orgName })
              return
            }

            setOrgResult({ type: 'success', orgName })
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{t('auth.orgName')}</Label>
              <Input id="orgName" name="orgName" type="text" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              {t('auth.login')}
            </Link>
            <Button type="submit" disabled={isLoading}>
              {t('auth.createOrg')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={Boolean(orgResult)} onOpenChange={(open) => (!open ? setOrgResult(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {orgResult?.type === 'success' ? t('auth.orgCreateSuccessTitle') : t('auth.orgCreateFailedTitle')}
            </DialogTitle>
            <DialogDescription>
              {orgResult?.type === 'success'
                ? t('auth.orgCreateSuccessMessage', { name: orgResult.orgName })
                : t('auth.orgCreateFailedMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {orgResult?.type === 'success' ? (
              <Button
                type="button"
                onClick={() => {
                  window.location.href = `/${locale}/dashboard`
                }}
              >
                {t('auth.goToDashboard')}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setOrgResult(null)}>
                {t('common.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
