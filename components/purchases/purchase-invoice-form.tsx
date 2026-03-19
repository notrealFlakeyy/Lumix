import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type SelectOption = { value: string; label: string }

export function PurchaseInvoiceForm({
  action,
  branches,
  vendors,
  products,
}: {
  action: (formData: FormData) => void | Promise<void>
  branches: SelectOption[]
  vendors: SelectOption[]
  products: SelectOption[]
}) {
  return (
    <form action={action} className="space-y-6">
      <Card >
        <CardHeader>
          <CardTitle>Bill Header</CardTitle>
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
            <Label htmlFor="vendor_id">Vendor</Label>
            <select id="vendor_id" name="vendor_id" required defaultValue="" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="" disabled>Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.value} value={vendor.value}>
                  {vendor.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_date">Invoice date</Label>
            <Input id="invoice_date" name="invoice_date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" name="due_date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue="draft" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="draft">draft</option>
              <option value="approved">approved</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference</Label>
            <Input id="reference_number" name="reference_number" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
        </CardContent>
      </Card>

      <Card >
        <CardHeader>
          <CardTitle>Bill Lines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[0, 1, 2].map((index) => (
            <div key={index} className="grid gap-4 rounded-2xl border border-slate-100 px-4 py-4 md:grid-cols-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`item_description_${index}`}>Description</Label>
                <Input id={`item_description_${index}`} name={`item_description_${index}`} placeholder={index === 0 ? 'Required for first line' : 'Optional line'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_inventory_product_id_${index}`}>Inventory product</Label>
                <select id={`item_inventory_product_id_${index}`} name={`item_inventory_product_id_${index}`} defaultValue="" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
                  <option value="">No stock link</option>
                  {products.map((product) => (
                    <option key={product.value} value={product.value}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_quantity_${index}`}>Qty</Label>
                <Input id={`item_quantity_${index}`} name={`item_quantity_${index}`} type="number" min="0" step="0.01" defaultValue={index === 0 ? '1' : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_unit_price_${index}`}>Unit price</Label>
                <Input id={`item_unit_price_${index}`} name={`item_unit_price_${index}`} type="number" min="0" step="0.01" defaultValue={index === 0 ? '0' : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item_vat_rate_${index}`}>VAT %</Label>
                <Input id={`item_vat_rate_${index}`} name={`item_vat_rate_${index}`} type="number" min="0" step="0.01" defaultValue={index === 0 ? '25.5' : ''} />
              </div>
            </div>
          ))}
          <Button type="submit">Create purchase bill</Button>
        </CardContent>
      </Card>
    </form>
  )
}
