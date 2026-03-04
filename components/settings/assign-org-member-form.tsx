'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OrgRole = 'owner' | 'admin' | 'accountant' | 'sales' | 'purchaser' | 'employee'
type AppModule = 'dashboard' | 'sales' | 'purchases' | 'accounting' | 'reporting' | 'payroll' | 'inventory' | 'settings' | 'time'

const moduleOptions: Array<{ module: AppModule; labelKey: string }> = [
  { module: 'dashboard', labelKey: 'nav.dashboard' },
  { module: 'time', labelKey: 'nav.time' },
  { module: 'sales', labelKey: 'nav.sales' },
  { module: 'purchases', labelKey: 'nav.purchases' },
  { module: 'accounting', labelKey: 'nav.accounting' },
  { module: 'reporting', labelKey: 'nav.reporting' },
  { module: 'payroll', labelKey: 'nav.payroll' },
  { module: 'inventory', labelKey: 'nav.inventory' },
  { module: 'settings', labelKey: 'nav.settings' },
]

export function AssignOrgMemberForm() {
  const t = useTranslations()
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [role, setRole] = React.useState<OrgRole>('employee')
  const [modules, setModules] = React.useState<Record<AppModule, boolean>>(() => ({
    dashboard: true,
    sales: true,
    purchases: true,
    accounting: true,
    reporting: true,
    payroll: true,
    inventory: true,
    settings: true,
    time: true,
  }))

  React.useEffect(() => {
    if (role !== 'employee') return
    setModules({
      dashboard: false,
      sales: false,
      purchases: false,
      accounting: false,
      reporting: false,
      payroll: false,
      inventory: false,
      settings: false,
      time: true,
    })
  }, [role])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('auth.assignOrgMemberTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t('auth.assignOrgMemberSubtitle')}</p>

        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setResult(null)
            setIsLoading(true)

            const formData = new FormData(e.currentTarget)
            const user = String(formData.get('user') ?? '').trim()
            const fullNameRaw = String(formData.get('fullName') ?? '').trim()
            const allowedModules = (Object.entries(modules) as Array<[AppModule, boolean]>)
              .filter(([, enabled]) => enabled)
              .map(([module]) => module)

            const res = await fetch('/api/admin/org-members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user,
                role,
                fullName: fullNameRaw ? fullNameRaw : null,
                allowedModules,
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
                    : code === 'userNotFound'
                      ? t('errors.notFound')
                      : code === 'serverMisconfigured'
                        ? t('errors.unexpected')
                        : t('errors.unexpected')
              setResult({ type: 'error', message })
              return
            }

            setResult({
              type: 'success',
              message: t('auth.assignOrgMemberSuccess', { userId: user, role: t(`auth.roles.${role}`) }),
            })
            ;(e.currentTarget as HTMLFormElement).reset()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="user">{t('auth.userIdentifier')}</Label>
            <Input id="user" name="user" placeholder={t('auth.userIdentifierPlaceholder')} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input id="fullName" name="fullName" placeholder={t('auth.fullNamePlaceholder')} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">{t('auth.role')}</Label>
            <select
              id="role"
              name="role"
              defaultValue="employee"
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--btn-from))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="owner">{t('auth.roles.owner')}</option>
              <option value="admin">{t('auth.roles.admin')}</option>
              <option value="accountant">{t('auth.roles.accountant')}</option>
              <option value="sales">{t('auth.roles.sales')}</option>
              <option value="purchaser">{t('auth.roles.purchaser')}</option>
              <option value="employee">{t('auth.roles.employee')}</option>
            </select>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t('auth.allowedModules')}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              {moduleOptions.map((opt) => (
                <label key={opt.module} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={modules[opt.module]}
                    disabled={role === 'employee' && opt.module !== 'time'}
                    onChange={(e) => setModules((prev) => ({ ...prev, [opt.module]: e.target.checked }))}
                  />
                  <span className={role === 'employee' && opt.module !== 'time' ? 'opacity-60' : undefined}>{t(opt.labelKey)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-3">
            <Button type="submit" disabled={isLoading}>
              {t('auth.assignOrgMember')}
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
