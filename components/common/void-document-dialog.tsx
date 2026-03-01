'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function VoidDocumentDialog({
  titleKey,
  endpoint,
  disabled,
  testId,
}: {
  titleKey: string
  endpoint: string
  disabled?: boolean
  testId?: string
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
        <Button variant="outline" size="sm" disabled={disabled} data-testid={testId}>
          {t('common.void')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            setIsLoading(true)
            const form = new FormData(e.currentTarget)
            const voidDate = String(form.get('voidDate') ?? '')
            const reason = String(form.get('reason') ?? '')

            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voidDate: voidDate || null, reason: reason || null }),
            })

            setIsLoading(false)

            if (!res.ok) {
              const payload = await res.json().catch(() => null)
              setError(payload?.message ?? t('errors.unexpected'))
              return
            }

            setOpen(false)
            router.refresh()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="voidDate">{t('common.date')}</Label>
            <Input id="voidDate" name="voidDate" type="date" defaultValue={today} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">{t('common.reason')}</Label>
            <Input id="reason" name="reason" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

