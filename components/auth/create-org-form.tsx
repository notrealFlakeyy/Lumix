'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateOrgForm({ locale }: { locale: string }) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<null | { type: 'success' | 'error'; orgName: string }>(null)

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.createOrg')}</CardTitle>
          <CardDescription>{t('common.appName')}</CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setIsLoading(true)

            const form = new FormData(e.currentTarget)
            const orgName = String(form.get('orgName') ?? '').trim()

            const res = await fetch(`/api/onboarding/create-org`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orgName }),
            })

            setIsLoading(false)

            if (!res.ok) {
              setResult({ type: 'error', orgName })
              return
            }

            setResult({ type: 'success', orgName })
          }}
        >
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{t('auth.orgName')}</Label>
              <Input id="orgName" name="orgName" type="text" required minLength={2} />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-end">
            <Button type="submit" disabled={isLoading}>
              {t('auth.createOrg')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={Boolean(result)} onOpenChange={(open) => (!open ? setResult(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {result?.type === 'success' ? t('auth.orgCreateSuccessTitle') : t('auth.orgCreateFailedTitle')}
            </DialogTitle>
            <DialogDescription>
              {result?.type === 'success'
                ? t('auth.orgCreateSuccessMessage', { name: result.orgName })
                : t('auth.orgCreateFailedMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {result?.type === 'success' ? (
              <Button
                type="button"
                onClick={() => {
                  window.location.href = `/${locale}/dashboard`
                }}
              >
                {t('auth.goToDashboard')}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => setResult(null)}>
                {t('common.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
