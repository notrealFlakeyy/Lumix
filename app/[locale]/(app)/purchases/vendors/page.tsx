import { getTranslations } from 'next-intl/server'

import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CreateVendorForm } from '@/components/purchases/create-vendor-form'

export default async function VendorsPage() {
  const t = await getTranslations()
  const { supabase, orgId } = await getCurrentOrg()
  if (!orgId) return null

  const { data: vendors } = await supabase
    .from('ap_vendors')
    .select('id, name, email, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('purchases.vendors')}</h1>
        <CreateVendorForm />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('purchases.vendors')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchases.vendorName')}</TableHead>
                <TableHead>{t('auth.email')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(vendors ?? []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.email ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
