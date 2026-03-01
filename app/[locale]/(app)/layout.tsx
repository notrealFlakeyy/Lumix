import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shell/sidebar'
import { LanguageSwitcher } from '@/components/i18n/language-switcher'
import { LogoutButton } from '@/components/auth/logout-button'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id
  if (!userId) {
    redirect(`/${locale}/login`)
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!membership?.org_id) {
    redirect(`/${locale}/onboarding`)
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', membership.org_id)
    .maybeSingle()

  const orgName = org?.name ?? ''

  return (
    <div className="min-h-screen bg-app bg-app-ambient">
      <div className="flex min-h-screen">
        <Sidebar className="hidden md:block" />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border/60 bg-app/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{orgName}</div>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <LogoutButton locale={locale} />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  )
}
