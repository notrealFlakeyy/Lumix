import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type SelectOption = { value: string; label: string }

export function PurchaseVendorForm({
  action,
  branches,
}: {
  action: (formData: FormData) => void | Promise<void>
  branches: SelectOption[]
}) {
  return (
    <form action={action}>
      <Card >
        <CardHeader>
          <CardTitle>New Vendor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <select id="branch_id" name="branch_id" required defaultValue={branches[0]?.value ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="" disabled>Select branch</option>
              {branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Vendor name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_id">Business ID</Label>
            <Input id="business_id" name="business_id" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address_line1">Address</Label>
            <Input id="address_line1" name="address_line1" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Create vendor</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
