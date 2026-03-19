'use client'

import * as React from 'react'

import { onboardingModuleBundles, platformModuleDefinitions } from '@/lib/platform/modules'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ActionState = {
  error: string | null
}

const onboardingInitialState: ActionState = {
  error: null,
}

// Map billing plan keys to the closest onboarding bundle
const planToBundle: Record<string, (typeof onboardingModuleBundles)[number]['key']> = {
  starter:    'transport',
  growth:     'hybrid',
  enterprise: 'hybrid',
}

export function CompanyOnboarding({
  locale,
  userEmail,
  demoCompanyAvailable,
  createCompany,
  claimDemoCompany,
  defaultPlan,
}: {
  locale: string
  userEmail: string | null
  demoCompanyAvailable: boolean
  createCompany: (state: ActionState, formData: FormData) => Promise<ActionState>
  claimDemoCompany: (state: ActionState, formData: FormData) => Promise<ActionState>
  defaultPlan?: string | null
}) {
  const [createState, createAction, isCreating] = React.useActionState(createCompany, onboardingInitialState)
  const [claimState, claimAction, isClaiming] = React.useActionState(claimDemoCompany, onboardingInitialState)

  const resolvedDefault: (typeof onboardingModuleBundles)[number]['key'] =
    (defaultPlan ? planToBundle[defaultPlan] : undefined) ?? 'transport'

  const [businessType, setBusinessType] = React.useState<(typeof onboardingModuleBundles)[number]['key']>(resolvedDefault)
  const [selectedModules, setSelectedModules] = React.useState<string[]>(
    onboardingModuleBundles.find((bundle) => bundle.key === resolvedDefault)?.enabledModules ?? ['core', 'transport'],
  )

  React.useEffect(() => {
    setSelectedModules(onboardingModuleBundles.find((bundle) => bundle.key === businessType)?.enabledModules ?? ['core', 'transport'])
  }, [businessType])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card >
        <CardHeader>
          <CardTitle>Create your company workspace</CardTitle>
          <CardDescription>Set up the initial tenant, choose the starting module footprint, and attach your current account as the owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="space-y-5">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-2">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" name="name" required placeholder="Northern Route Logistics Oy" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_id">Business ID</Label>
                <Input id="business_id" name="business_id" placeholder="3245567-8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">VAT number</Label>
                <Input id="vat_number" name="vat_number" placeholder="FI32455678" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Company email</Label>
                <Input id="email" name="email" type="email" defaultValue={userEmail ?? ''} placeholder="ops@company.fi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+358401234567" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="Turku" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue="FI" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue="Europe/Helsinki" />
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border/30 bg-[rgb(var(--app-surface))] px-4 py-4">
              <div>
                <div className="text-sm font-medium text-foreground">Business template</div>
                <div className="text-sm text-muted-foreground">Choose the closest operating model. You can still adjust the exact module mix below.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {onboardingModuleBundles.map((bundle) => (
                  <label
                    key={bundle.key}
                    className={`rounded-xl border px-4 py-4 text-sm transition ${businessType === bundle.key ? 'border-[rgba(var(--app-accent),0.4)] bg-[rgb(var(--app-surface))] shadow-sm' : 'border-border/30 bg-[rgba(var(--app-surface),0.9)]'}`}
                  >
                    <input
                      type="radio"
                      name="business_type"
                      value={bundle.key}
                      checked={businessType === bundle.key}
                      onChange={() => setBusinessType(bundle.key)}
                      className="sr-only"
                    />
                    <div className="font-medium text-foreground">{bundle.label}</div>
                    <div className="mt-1 text-muted-foreground">{bundle.description}</div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border/30 bg-[rgb(var(--app-surface))] px-4 py-4">
              <div>
                <div className="text-sm font-medium text-foreground">Enabled modules</div>
                <div className="text-sm text-muted-foreground">Keep the tenant lean. Turn on only what this client is actually buying today.</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {platformModuleDefinitions.map((module) => (
                  <label
                    key={module.key}
                    className={`rounded-xl border px-4 py-4 text-sm ${module.alwaysEnabled ? 'border-border/50 bg-[rgb(var(--app-surface))]' : 'border-border/30 bg-[rgba(var(--app-surface),0.9)]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="enabled_modules"
                        value={module.key}
                        checked={selectedModules.includes(module.key)}
                        disabled={module.alwaysEnabled}
                        onChange={(event) => {
                          if (module.alwaysEnabled) {
                            return
                          }

                          setSelectedModules((current) =>
                            event.target.checked
                              ? [...new Set([...current, module.key])]
                              : current.filter((entry) => entry !== module.key),
                          )
                        }}
                        className="h-4 w-4 rounded border-border/50"
                      />
                      <div className="font-medium text-foreground">{module.label}</div>
                    </div>
                    <div className="mt-2 text-muted-foreground">{module.description}</div>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="initial_branch_name">Initial branch or terminal</Label>
                <Input id="initial_branch_name" name="initial_branch_name" placeholder="Helsinki Terminal" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initial_branch_code">Branch code</Label>
                <Input id="initial_branch_code" name="initial_branch_code" placeholder="HEL" />
              </div>
            </div>
            {createState.error ? <p className="text-sm text-destructive">{createState.error}</p> : null}
            <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-4">
              <p className="text-sm text-muted-foreground">Your account will be added as the first `owner` member and the selected modules will be enabled immediately.</p>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating company...' : 'Create company'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle>Use the demo workspace</CardTitle>
          <CardDescription>Attach this user to the seeded presentation tenant if you already ran the demo seed SQL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/30 bg-[rgb(var(--app-surface))] p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Demo company</p>
            <p>Northern Route Logistics Oy</p>
            <p className="mt-2 text-muted-foreground">Use this if you want the preloaded orders, trips, invoices, and reports immediately.</p>
            <p className="mt-2 text-muted-foreground">The demo tenant starts with the transport module enabled so you can show the full dispatch and invoicing story right away.</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {demoCompanyAvailable ? 'Demo tenant found' : 'Demo tenant not found'}
            </p>
          </div>
          {!demoCompanyAvailable ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The seeded demo company is not present in this database yet. Run `schema-and-seed.sql` or create your own company workspace instead.
            </div>
          ) : null}
          <form action={claimAction} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            {claimState.error ? <p className="text-sm text-destructive">{claimState.error}</p> : null}
            <Button type="submit" disabled={isClaiming || !demoCompanyAvailable}>
              {isClaiming ? 'Connecting...' : 'Join demo company'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Current session</CardTitle>
          <CardDescription>Use this account for the initial company membership.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/30 bg-[rgb(var(--app-surface))] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Signed in as</p>
            <p className="mt-2 text-sm font-medium text-foreground">{userEmail ?? 'No email available from session'}</p>
          </div>
          <div className="rounded-lg border border-border/30 bg-[rgb(var(--app-surface))] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Next step</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a company to start from scratch with the right module footprint, or join the demo tenant if you want seeded transportation data immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
