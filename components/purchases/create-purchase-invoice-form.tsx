'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type VendorOption = { id: string; name: string }

export function CreatePurchaseInvoiceForm({ vendors }: { vendors: VendorOption[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-purchase-invoice">{t('purchases.newPurchaseInvoice')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('purchases.newPurchaseInvoice')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setIsLoading(true)
            const form = new FormData(e.currentTarget)

            const vendorIdValue = String(form.get('vendorId') ?? '')
            const vendorInvoiceNumber = String(form.get('vendorInvoiceNumber') ?? '')
            const dueDate = String(form.get('dueDate') ?? '')

            const description = String(form.get('description') ?? '')
            const quantity = String(form.get('quantity') ?? '1')
            const unitPrice = String(form.get('unitPrice') ?? '0')
            const vatRate = String(form.get('vatRate') ?? '24')

            const res = await fetch('/api/purchases/invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendorId: vendorIdValue || null,
                vendorInvoiceNumber: vendorInvoiceNumber || null,
                dueDate: dueDate || null,
                lines: [
                  {
                    description,
                    quantity,
                    unitPrice,
                    vatRate,
                    expenseAccountNo: '4000',
                    vatAccountNo: '1570'
                  }
                ]
              })
            })

            setIsLoading(false)

            if (!res.ok) {
              setError(t('errors.unexpected'))
              return
            }

            setOpen(false)
            router.refresh()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="vendorId">{t('purchases.vendors')}</Label>
            <select
              id="vendorId"
              name="vendorId"
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--btn-from))]"
              defaultValue=""
              data-testid="purchase-vendor"
            >
              <option value="">{t('common.select')}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vendorInvoiceNumber">{t('purchases.vendorInvoiceNumber')}</Label>
              <Input id="vendorInvoiceNumber" name="vendorInvoiceNumber" data-testid="purchase-vendorInvoiceNumber" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('sales.dueDate')}</Label>
              <Input id="dueDate" name="dueDate" type="date" data-testid="purchase-dueDate" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Input id="description" name="description" required data-testid="purchase-description" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('common.quantity')}</Label>
              <Input id="quantity" name="quantity" type="number" step="0.001" defaultValue="1" required data-testid="purchase-quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t('common.unitPrice')}</Label>
              <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue="0" required data-testid="purchase-unitPrice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">{t('common.vatRate')}</Label>
              <Input id="vatRate" name="vatRate" type="number" step="0.001" defaultValue="24" required data-testid="purchase-vatRate" />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="purchase-submit">
              {t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
