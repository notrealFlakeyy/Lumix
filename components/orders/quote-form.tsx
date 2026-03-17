import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type SelectOption = { value: string; label: string }

type QuoteDefaults = {
  branch_id?: string | null
  customer_id?: string | null
  title?: string | null
  pickup_location?: string | null
  delivery_location?: string | null
  cargo_description?: string | null
  issue_date?: string | null
  valid_until?: string | null
  status?: string | null
  notes?: string | null
}

type QuoteLine = {
  description?: string
  quantity?: number | string
  unit_price?: number | string
  vat_rate?: number | string
}

export function QuoteForm({
  action,
  defaults,
  customers,
  branches,
  items,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: QuoteDefaults
  customers: SelectOption[]
  branches?: SelectOption[]
  items: QuoteLine[]
  submitLabel: string
}) {
  const paddedItems = [...items]
  while (paddedItems.length < 3) paddedItems.push({})

  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Quote Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <select id="branch_id" name="branch_id" defaultValue={defaults?.branch_id ?? branches?.[0]?.value ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">No branch</option>
              {(branches ?? []).map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer</Label>
            <select id="customer_id" name="customer_id" defaultValue={defaults?.customer_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="" disabled>Select customer</option>
              {customers.map((customer) => (
                <option key={customer.value} value={customer.value}>
                  {customer.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Quote Title</Label>
            <Input id="title" name="title" defaultValue={defaults?.title ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={defaults?.status ?? 'draft'} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="draft">draft</option>
              <option value="sent">sent</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="expired">expired</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pickup_location">Pickup Location</Label>
            <Input id="pickup_location" name="pickup_location" defaultValue={defaults?.pickup_location ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delivery_location">Delivery Location</Label>
            <Input id="delivery_location" name="delivery_location" defaultValue={defaults?.delivery_location ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue_date">Issue Date</Label>
            <Input id="issue_date" name="issue_date" type="date" defaultValue={defaults?.issue_date ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input id="valid_until" name="valid_until" type="date" defaultValue={defaults?.valid_until ?? ''} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cargo_description">Cargo Description</Label>
            <Textarea id="cargo_description" name="cargo_description" defaultValue={defaults?.cargo_description ?? ''} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ''} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Quote Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paddedItems.map((item, index) => (
            <div key={index} className="grid gap-4 rounded-xl border border-slate-100 p-4 md:grid-cols-[2fr_repeat(3,1fr)]">
              <div className="space-y-2">
                <Label htmlFor={`item_description_${index}`}>Description</Label>
                <Input id={`item_description_${index}`} name={`item_description_${index}`} defaultValue={item.description ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_quantity_${index}`}>Quantity</Label>
                <Input id={`item_quantity_${index}`} name={`item_quantity_${index}`} type="number" step="0.01" defaultValue={item.quantity ?? 1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_unit_price_${index}`}>Unit Price</Label>
                <Input id={`item_unit_price_${index}`} name={`item_unit_price_${index}`} type="number" step="0.01" defaultValue={item.unit_price ?? ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_vat_rate_${index}`}>VAT Rate</Label>
                <Input id={`item_vat_rate_${index}`} name={`item_vat_rate_${index}`} type="number" step="0.01" defaultValue={item.vat_rate ?? 25.5} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
