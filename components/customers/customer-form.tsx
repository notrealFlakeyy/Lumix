import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type CustomerDefaults = {
  branch_id?: string | null
  name?: string | null
  business_id?: string | null
  vat_number?: string | null
  email?: string | null
  phone?: string | null
  billing_address_line1?: string | null
  billing_address_line2?: string | null
  billing_postal_code?: string | null
  billing_city?: string | null
  billing_country?: string | null
  notes?: string | null
}

type SelectOption = { value: string; label: string }

export function CustomerForm({
  action,
  defaults,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: CustomerDefaults
  branches?: SelectOption[]
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_id">Business ID</Label>
            <Input id="business_id" name="business_id" defaultValue={defaults?.business_id ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vat_number">VAT Number</Label>
            <Input id="vat_number" name="vat_number" defaultValue={defaults?.vat_number ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_address_line1">Billing Address Line 1</Label>
            <Input id="billing_address_line1" name="billing_address_line1" defaultValue={defaults?.billing_address_line1 ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_address_line2">Billing Address Line 2</Label>
            <Input id="billing_address_line2" name="billing_address_line2" defaultValue={defaults?.billing_address_line2 ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_postal_code">Postal Code</Label>
            <Input id="billing_postal_code" name="billing_postal_code" defaultValue={defaults?.billing_postal_code ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_city">City</Label>
            <Input id="billing_city" name="billing_city" defaultValue={defaults?.billing_city ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_country">Country</Label>
            <Input id="billing_country" name="billing_country" defaultValue={defaults?.billing_country ?? 'FI'} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={defaults?.notes ?? ''} />
          </div>
        </CardContent>
      </Card>
      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
