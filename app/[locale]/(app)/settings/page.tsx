import { getTranslations } from 'next-intl/server'

import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SettingsPage() {
  const t = await getTranslations()
  const { supabase, orgId } = await getCurrentOrg()
  if (!orgId) return null

  const { data: lock } = await supabase.from('accounting_locks').select('locked_until').eq('org_id', orgId).maybeSingle()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h1>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('accounting.lockDate')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{lock?.locked_until ?? ''}</CardContent>
      </Card>
    </div>
  )
}
