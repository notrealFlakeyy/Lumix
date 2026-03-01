'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OrgRole = 'owner' | 'admin' | 'accountant' | 'sales' | 'purchaser' | 'employee'

export function CreateUserForm() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('auth.createUserTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t('auth.createUserSubtitle')}</p>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setResult(null)
            setIsLoading(true)

            const formData = new FormData(e.currentTarget)
            const email = String(formData.get('email') ?? '').trim()
            const fullNameRaw = String(formData.get('fullName') ?? '').trim()
            const password = String(formData.get('password') ?? '')
            const role = String(formData.get('role') ?? 'employee') as OrgRole

            const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                password,
                fullName: fullNameRaw ? fullNameRaw : null,
                role,
              }),
            }).catch(() => null)

            setIsLoading(false)

            if (!res) {
              setResult({ type: 'error', message: t('errors.unexpected') })
              return
            }

            if (!res.ok) {
              const body = (await res.json().catch(() => null)) as null | { code?: string }
              const code = body?.code
              const message =
                code === 'forbidden'
                  ? t('errors.unauthorized')
                  : code === 'invalidPayload'
                    ? t('errors.required')
                    : code === 'userCreateFailed'
                      ? t('errors.unexpected')
                      : code === 'membershipCreateFailed'
                        ? t('errors.unexpected')
                        : code === 'serverMisconfigured'
                          ? t('errors.unexpected')
                          : t('errors.unexpected')
              setResult({ type: 'error', message })
              return
            }

            const body = (await res.json().catch(() => null)) as null | { userId?: string }
            const userId = body?.userId

            setResult({
              type: 'success',
              message: t('auth.createUserSuccess', {
                email,
                userId: userId ?? '',
                role: t(`auth.roles.${role}`),
              }),
            })
            ;(e.currentTarget as HTMLFormElement).reset()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" name="email" type="email" placeholder={t('auth.emailPlaceholder')} required autoComplete="off" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input id="fullName" name="fullName" placeholder={t('auth.fullNamePlaceholder')} autoComplete="off" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t('auth.tempPassword')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={10}
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">{t('auth.role')}</Label>
            <select
              id="role"
              name="role"
              defaultValue="employee"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--btn-from))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="employee">{t('auth.roles.employee')}</option>
              <option value="sales">{t('auth.roles.sales')}</option>
              <option value="purchaser">{t('auth.roles.purchaser')}</option>
              <option value="accountant">{t('auth.roles.accountant')}</option>
              <option value="admin">{t('auth.roles.admin')}</option>
              <option value="owner">{t('auth.roles.owner')}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={isLoading}>
              {t('auth.createUser')}
            </Button>
          </div>
        </form>

        {result ? (
          <div
            className={[
              'rounded-lg border p-4 text-sm',
              result.type === 'success' ? 'border-primary/20 bg-primary/10 text-foreground' : 'border-destructive/20 bg-destructive/10 text-foreground',
            ].join(' ')}
            role={result.type === 'error' ? 'alert' : undefined}
          >
            {result.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

