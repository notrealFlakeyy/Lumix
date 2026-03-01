'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function MarkPurchaseInvoicePaidDialog({ invoiceId, defaultAmount }: { invoiceId: string; defaultAmount: number }) {
  const t = useTranslations()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" data-testid={`pay-purchase-invoice:${invoiceId}`}>
          {t('purchases.markPaid')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('purchases.markPaid')}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setIsLoading(true)
            const form = new FormData(e.currentTarget)
            const paymentDate = String(form.get('paymentDate') ?? '')
            const amount = String(form.get('amount') ?? '')

            const res = await fetch(`/api/purchases/invoices/${invoiceId}/payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentDate, amount }),
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">{t('common.date')}</Label>
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required data-testid="purchase-payment-date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t('common.amount')}</Label>
              <Input id="amount" name="amount" type="number" step="0.01" defaultValue={String(defaultAmount)} required data-testid="purchase-payment-amount" />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="purchase-payment-submit">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
