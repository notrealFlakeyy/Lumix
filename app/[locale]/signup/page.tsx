import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default async function SignupPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-16">
      <Card className="mx-auto max-w-2xl border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Invite-only access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>This MVP uses Supabase Auth for sign-in. After login, users without a membership can create their company workspace or attach themselves to the seeded demo tenant from the onboarding page.</p>
          <Button asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
