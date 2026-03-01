import { getTranslations } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'
import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { formatEur } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params
  const t = await getTranslations()
  const { supabase, orgId } = await getCurrentOrg()

  if (!orgId) {
    return null
  }

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)

  const { data: overdueAr } = await supabase
    .from('ar_invoices')
    .select('total')
    .eq('org_id', orgId)
    .in('status', ['sent', 'overdue'])
    .lt('due_date', todayIso)

  const overdueTotal = (overdueAr ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0)

  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const nextWeekIso = nextWeek.toISOString().slice(0, 10)

  const { data: upcomingAp } = await supabase
    .from('ap_invoices')
    .select('total')
    .eq('org_id', orgId)
    .in('status', ['approved', 'sent'])
    .gte('due_date', todayIso)
    .lte('due_date', nextWeekIso)

  const upcomingTotal = (upcomingAp ?? []).reduce((sum, row) => sum + Number(row.total ?? 0), 0)

  const { data: bankAccount } = await supabase
    .from('gl_accounts')
    .select('id')
    .eq('org_id', orgId)
    .eq('number', '1910')
    .maybeSingle()

  const { data: bankLines } = bankAccount?.id
    ? await supabase.from('gl_lines').select('debit, credit').eq('org_id', orgId).eq('account_id', bankAccount.id)
    : { data: [] as Array<{ debit: string; credit: string }> }

  const cashBalance = (bankLines ?? []).reduce((sum, line) => sum + Number(line.debit ?? 0) - Number(line.credit ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.title')}</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.cashBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatEur(locale, cashBalance)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.overdueReceivables')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatEur(locale, overdueTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.upcomingPayables')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatEur(locale, upcomingTotal)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
