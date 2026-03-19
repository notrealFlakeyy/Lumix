import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function PaymentForm({
  invoiceId,
  action,
}: {
  invoiceId: string
  action: (formData: FormData) => void | Promise<void>
}) {
  return (
    <form action={action}>
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <Card >
        <CardHeader>
          <CardTitle>Register Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input id="payment_date" name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Input id="payment_method" name="payment_method" defaultValue="Bank transfer" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Register Payment</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
