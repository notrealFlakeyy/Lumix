import { redirect } from 'next/navigation'

import { claimDemoCompanyAction, createCompanyAction } from './actions'
import { CompanyOnboarding } from '@/components/auth/company-onboarding'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentMembership } from '@/lib/auth/get-current-membership'

const demoCompanyId = '11111111-1111-1111-1111-111111111111'

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ plan?: string }>
}) {
  const { locale } = await params
  const { plan } = await searchParams
  const { user, membership, supabase } = await getCurrentMembership()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (membership?.company_id) {
    redirect(`/${locale}/dashboard`)
  }

  const { data: demoCompany } = await supabase.from('companies').select('id').eq('id', demoCompanyId).maybeSingle()

  return (
    <main className="min-h-screen px-6 py-16" style={{ background: 'rgb(var(--app-bg))' }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <Card >
          <CardHeader>
            <CardTitle>Finish company setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your account is signed in, but it does not have an active company membership yet.</p>
            <p>Create a new company workspace or attach yourself to the seeded demo company, then you will be redirected into the ERP dashboard.</p>
          </CardContent>
        </Card>

        <CompanyOnboarding
          locale={locale}
          userEmail={user.email ?? null}
          demoCompanyAvailable={Boolean(demoCompany)}
          createCompany={createCompanyAction}
          claimDemoCompany={claimDemoCompanyAction}
          defaultPlan={plan ?? null}
        />
      </div>
    </main>
  )
}
