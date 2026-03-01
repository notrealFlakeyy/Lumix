'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateInvoiceForm() {
  const t = useTranslations()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-invoice">{t('sales.newInvoice')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sales.newInvoice')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setIsLoading(true)
            const form = new FormData(e.currentTarget)

            const customerName = String(form.get('customerName') ?? '').trim()
            const dueDate = String(form.get('dueDate') ?? '')
            const referenceNumber = String(form.get('referenceNumber') ?? '')

            const description = String(form.get('description') ?? '')
            const quantity = String(form.get('quantity') ?? '1')
            const unitPrice = String(form.get('unitPrice') ?? '0')
            const vatRate = String(form.get('vatRate') ?? '24')

            if (!customerName) {
              setIsLoading(false)
              setError(t('errors.required'))
              return
            }

            const customerRes = await fetch('/api/sales/customers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: customerName, email: '' }),
            })

            if (!customerRes.ok) {
              const body = await customerRes.json().catch(() => null)
              console.error('Create customer failed', { status: customerRes.status, body })
              setIsLoading(false)
              setError(t('errors.unexpected'))
              return
            }

            const customerJson = (await customerRes.json().catch(() => null)) as null | { id?: string }
            const customerId = customerJson?.id

            if (!customerId) {
              console.error('Create customer missing id', { customerJson })
              setIsLoading(false)
              setError(t('errors.unexpected'))
              return
            }

            const res = await fetch('/api/sales/invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId,
                dueDate: dueDate || null,
                referenceNumber: referenceNumber || null,
                lines: [
                  {
                    description,
                    quantity,
                    unitPrice,
                    vatRate,
                  },
                ],
              }),
            })

            setIsLoading(false)

            if (!res.ok) {
              const body = await res.json().catch(() => null)
              console.error('Create invoice failed', { status: res.status, body })
              setError(t('errors.unexpected'))
              return
            }

            setOpen(false)
            router.refresh()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="customerName">{t('sales.customerName')}</Label>
            <Input id="customerName" name="customerName" required data-testid="invoice-customerName" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('sales.dueDate')}</Label>
              <Input id="dueDate" name="dueDate" type="date" data-testid="invoice-dueDate" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">{t('sales.referenceNumber')}</Label>
              <Input id="referenceNumber" name="referenceNumber" data-testid="invoice-referenceNumber" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Input id="description" name="description" required data-testid="invoice-description" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">{t('common.quantity')}</Label>
              <Input id="quantity" name="quantity" type="number" step="0.001" defaultValue="1" required data-testid="invoice-quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">{t('common.unitPrice')}</Label>
              <Input id="unitPrice" name="unitPrice" type="number" step="0.01" defaultValue="0" required data-testid="invoice-unitPrice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">{t('common.vatRate')}</Label>
              <Input id="vatRate" name="vatRate" type="number" step="0.001" defaultValue="24" required data-testid="invoice-vatRate" />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="invoice-submit">
              {t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
