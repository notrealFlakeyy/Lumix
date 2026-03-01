import { getTranslations } from 'next-intl/server'

import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function AccountingPage() {
  const t = await getTranslations()
  const { supabase, orgId } = await getCurrentOrg()
  if (!orgId) return null

  const [{ data: accounts }, { data: entries }] = await Promise.all([
    supabase.from('gl_accounts').select('id, number, name, type').eq('org_id', orgId).order('number').limit(50),
    supabase
      .from('gl_entries')
      .select('id, entry_date, description, source_type')
      .eq('org_id', orgId)
      .order('entry_date', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('accounting.title')}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('accounting.chartOfAccounts')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.accountNumber')}</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.type')}</TableHead>
              </TableRow>
            </TableHeader>
              <TableBody>
                {(accounts ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.number}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('accounting.journalEntries')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.date')}</TableHead>
                  <TableHead>{t('common.description')}</TableHead>
                  <TableHead>{t('common.source')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entries ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{e.entry_date}</TableCell>
                    <TableCell className="font-medium">
                      {systemEntryKey(e.source_type, e.description) ? t(systemEntryKey(e.source_type, e.description)!) : e.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t(sourceKey(e.source_type))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function sourceKey(sourceType: string) {
  switch (sourceType) {
    case 'ar_invoice':
      return 'accounting.source.arInvoice'
    case 'ap_invoice':
      return 'accounting.source.apInvoice'
    case 'payroll':
      return 'accounting.source.payroll'
    case 'inventory':
      return 'accounting.source.inventory'
    case 'bank_import':
      return 'accounting.source.bankImport'
    default:
      return 'accounting.source.manual'
  }
}

function systemEntryKey(sourceType: string, description: string): string | null {
  if (sourceType === 'ar_invoice' && description === 'AR invoice') return 'accounting.entry.arInvoice'
  if (sourceType === 'ar_invoice' && description === 'AR payment') return 'accounting.entry.arPayment'
  if (sourceType === 'ap_invoice' && description === 'AP invoice') return 'accounting.entry.apInvoice'
  if (sourceType === 'ap_invoice' && description === 'AP payment') return 'accounting.entry.apPayment'

  return null
}
