import { getTranslations } from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PayrollPage() {
  const t = await getTranslations()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('payroll.title')}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.employees')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('common.comingSoon')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.timeEntries')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('common.comingSoon')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('payroll.expenseClaims')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('common.comingSoon')}</CardContent>
        </Card>
      </div>
    </div>
  )
}
