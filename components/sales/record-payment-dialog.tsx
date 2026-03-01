'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RecordPaymentDialog({
  invoiceId,
  defaultAmount,
}: {
  invoiceId: string
  defaultAmount: number
}) {
  const t = useTranslations()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" data-testid={`record-payment:${invoiceId}`}>
          {t('sales.recordPayment')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sales.recordPayment')}</DialogTitle>
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
            const referenceNumber = String(form.get('referenceNumber') ?? '')

            const res = await fetch(`/api/sales/invoices/${invoiceId}/payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentDate, amount, referenceNumber: referenceNumber || null }),
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
              <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required data-testid="payment-date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t('common.amount')}</Label>
              <Input id="amount" name="amount" type="number" step="0.01" defaultValue={String(defaultAmount)} required data-testid="payment-amount" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">{t('sales.referenceNumber')}</Label>
            <Input id="referenceNumber" name="referenceNumber" data-testid="payment-reference" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="payment-submit">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
