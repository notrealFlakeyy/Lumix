'use client'

import * as React from 'react'

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

export function CompanyOnboarding({
  locale,
  userEmail,
  demoCompanyAvailable,
  createCompany,
  claimDemoCompany,
}: {
  locale: string
  userEmail: string | null
  demoCompanyAvailable: boolean
  createCompany: (state: ActionState, formData: FormData) => Promise<ActionState>
  claimDemoCompany: (state: ActionState, formData: FormData) => Promise<ActionState>
}) {
  const [createState, createAction, isCreating] = React.useActionState(createCompany, onboardingInitialState)
  const [claimState, claimAction, isClaiming] = React.useActionState(claimDemoCompany, onboardingInitialState)

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Create your company workspace</CardTitle>
          <CardDescription>Set up the initial tenant and attach your current account as the owner.</CardDescription>
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
            {createState.error ? <p className="text-sm text-destructive">{createState.error}</p> : null}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">Your account will be added as the first `owner` member.</p>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating company...' : 'Create company'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Use the demo workspace</CardTitle>
          <CardDescription>Attach this user to the seeded presentation tenant if you already ran the demo seed SQL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Demo company</p>
            <p>Northern Route Logistics Oy</p>
            <p className="mt-2 text-slate-600">Use this if you want the preloaded orders, trips, invoices, and reports immediately.</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
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

      <Card className="border-slate-200/80 bg-white/90 lg:col-span-2">
        <CardHeader>
          <CardTitle>Current session</CardTitle>
          <CardDescription>Use this account for the initial company membership.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Signed in as</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{userEmail ?? 'No email available from session'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Next step</p>
            <p className="mt-2 text-sm text-slate-700">
              Create a company to start from scratch, or join the demo tenant if you want seeded transportation data immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
