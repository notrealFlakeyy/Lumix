import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function PurchasePaymentForm({
  action,
  defaultAmount,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaultAmount: number
}) {
  return (
    <form action={action}>
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Register Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment date</Label>
            <Input id="payment_date" name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={defaultAmount.toFixed(2)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Register payment</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
