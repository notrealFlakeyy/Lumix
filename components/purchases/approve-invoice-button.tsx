'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export function ApprovePurchaseInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations()
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  return (
    <Button
      size="sm"
      disabled={isLoading}
      data-testid={`approve-purchase-invoice:${invoiceId}`}
      onClick={async () => {
        setIsLoading(true)
        await fetch(`/api/purchases/invoices/${invoiceId}/approve`, { method: 'POST' })
        setIsLoading(false)
        router.refresh()
      }}
    >
      {t('purchases.approve')}
    </Button>
  )
}
