import { getTranslations } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'
import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { formatDate } from '@/lib/format'
import { TimeStampCard, type TimeEntry } from '@/components/time/time-stamp-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function TimePage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params
  const t = await getTranslations()
  const { supabase, orgId, user } = await getCurrentOrg()

  if (!orgId || !user) return null

  const { data: employee } = await supabase
    .from('hr_employees')
    .select('id, full_name')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!employee?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.time')}</h1>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.time.missingEmployeeTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('payroll.time.missingEmployeeMessage')}</CardContent>
        </Card>
      </div>
    )
  }

  const { data: active } = await supabase
    .from('pay_time_entries')
    .select('id, start_time, end_time, minutes')
    .eq('org_id', orgId)
    .eq('employee_id', employee.id)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: entries } = await supabase
    .from('pay_time_entries')
    .select('id, start_time, end_time, minutes')
    .eq('org_id', orgId)
    .eq('employee_id', employee.id)
    .order('start_time', { ascending: false })
    .limit(25)

  const activeEntry = active
    ? ({
        id: active.id,
        start_time: String(active.start_time),
        end_time: active.end_time ? String(active.end_time) : null,
        minutes: Number(active.minutes ?? 0),
      } satisfies TimeEntry)
    : null

  const list = (entries ?? []).map((e) => ({
    id: e.id,
    start_time: String(e.start_time),
    end_time: e.end_time ? String(e.end_time) : null,
    minutes: Number(e.minutes ?? 0),
  })) satisfies TimeEntry[]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.time')}</h1>
        <p className="text-sm text-muted-foreground">{employee.full_name}</p>
      </div>

      <TimeStampCard active={activeEntry} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.time.recent')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('payroll.time.start')}</TableHead>
                <TableHead>{t('payroll.time.end')}</TableHead>
                <TableHead className="text-right">{t('payroll.time.minutes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((e) => {
                const start = new Date(e.start_time)
                const end = e.end_time ? new Date(e.end_time) : null
                const day = formatDate(locale, start)
                const startTime = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                const endTime = end ? end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : ''
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{day}</TableCell>
                    <TableCell>{startTime}</TableCell>
                    <TableCell className="text-muted-foreground">{endTime}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.minutes}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

