import { getTranslations } from 'next-intl/server'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ReportingPage() {
  const t = await getTranslations()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('reporting.title')}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporting.profitAndLoss')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('common.comingSoon')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('reporting.balanceSheet')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t('common.comingSoon')}</CardContent>
        </Card>
      </div>
    </div>
  )
}
