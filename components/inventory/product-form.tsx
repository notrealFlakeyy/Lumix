import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type SelectOption = { value: string; label: string }

type InventoryProductDefaults = {
  branch_id?: string | null
  sku?: string | null
  name?: string | null
  category?: string | null
  unit?: string | null
  reorder_level?: number | string | null
  cost_price?: number | string | null
  sale_price?: number | string | null
  notes?: string | null
  is_active?: boolean | null
}

export function InventoryProductForm({
  action,
  branches,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  branches: SelectOption[]
  defaults?: InventoryProductDefaults
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card >
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <select
              id="branch_id"
              name="branch_id"
              required
              defaultValue={defaults?.branch_id ?? branches[0]?.value ?? ''}
              className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm"
            >
              <option value="" disabled>
                Select branch
              </option>
              {branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={defaults?.sku ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" defaultValue={defaults?.name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" defaultValue={defaults?.category ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" name="unit" defaultValue={defaults?.unit ?? 'pcs'} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reorder_level">Reorder level</Label>
            <Input id="reorder_level" name="reorder_level" type="number" min="0" step="0.01" defaultValue={defaults?.reorder_level ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost_price">Cost price</Label>
            <Input id="cost_price" name="cost_price" type="number" min="0" step="0.01" defaultValue={defaults?.cost_price ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale_price">Sale price</Label>
            <Input id="sale_price" name="sale_price" type="number" min="0" step="0.01" defaultValue={defaults?.sale_price ?? ''} />
          </div>
          <div className="flex items-start gap-3 md:col-span-2">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              value="true"
              defaultChecked={defaults?.is_active ?? true}
              className="mt-1 h-4 w-4 rounded border-border/40"
            />
            <div className="space-y-1">
              <Label htmlFor="is_active">Active product</Label>
              <p className="text-sm text-muted-foreground">Inactive products stay in history but no longer show as operational stock master data.</p>
            </div>
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
