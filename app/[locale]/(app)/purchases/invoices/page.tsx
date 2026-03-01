import { getTranslations } from 'next-intl/server'

import type { AppLocale } from '@/i18n/routing'
import { getCurrentOrg } from '@/lib/auth/get-current-org'
import { formatDate, formatEur } from '@/lib/format'
import { StatusBadge } from '@/components/common/status-badge'
import { VoidDocumentDialog } from '@/components/common/void-document-dialog'
import { ApprovePurchaseInvoiceButton } from '@/components/purchases/approve-invoice-button'
import { CreatePurchaseInvoiceForm } from '@/components/purchases/create-purchase-invoice-form'
import { MarkPurchaseInvoicePaidDialog } from '@/components/purchases/mark-paid-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function PurchaseInvoicesPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params
  const t = await getTranslations()
  const { supabase, orgId } = await getCurrentOrg()
  if (!orgId) return null

  const [{ data: invoices }, { data: vendors }] = await Promise.all([
    supabase
      .from('ap_invoices')
      .select('id, vendor_invoice_number, due_date, total, status, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('ap_vendors').select('id, name').eq('org_id', orgId).order('name'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('purchases.purchaseInvoices')}</h1>
        <CreatePurchaseInvoiceForm vendors={(vendors ?? []).map((v) => ({ id: v.id, name: v.name }))} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('purchases.purchaseInvoices')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchases.purchaseInvoices')}</TableHead>
                <TableHead>{t('sales.dueDate')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((inv) => {
                const total = Number(inv.total ?? 0)
                const dueLabel = inv.due_date ? formatDate(locale, new Date(inv.due_date)) : ''
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.vendor_invoice_number ?? ''}</TableCell>
                    <TableCell className="text-muted-foreground">{dueLabel}</TableCell>
                    <TableCell>{formatEur(locale, total)}</TableCell>
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {inv.status === 'draft' ? <ApprovePurchaseInvoiceButton invoiceId={inv.id} /> : null}
                      {inv.status === 'approved' ? (
                        <MarkPurchaseInvoicePaidDialog invoiceId={inv.id} defaultAmount={total} />
                      ) : null}
                      {inv.status !== 'void' ? (
                        <VoidDocumentDialog
                          titleKey="purchases.voidInvoice"
                          endpoint={`/api/purchases/invoices/${inv.id}/void`}
                          disabled={inv.status === 'paid'}
                        />
                      ) : null}
                    </TableCell>
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
