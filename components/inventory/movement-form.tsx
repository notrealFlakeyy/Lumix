import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toDateTimeInputValue } from '@/lib/utils/forms'

type MovementDefaults = {
  movement_type?: string | null
  quantity?: number | string | null
  unit_cost?: number | string | null
  reference?: string | null
  notes?: string | null
  occurred_at?: string | null
}

export function InventoryMovementForm({
  action,
  productId,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => void | Promise<void>
  productId: string
  submitLabel: string
  defaults?: MovementDefaults
}) {
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="product_id" value={productId} />
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Record Stock Movement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="movement_type">Movement type</Label>
            <select
              id="movement_type"
              name="movement_type"
              defaultValue={defaults?.movement_type ?? 'receipt'}
              className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm"
            >
              <option value="receipt">Receipt</option>
              <option value="issue">Issue</option>
              <option value="adjustment_in">Adjustment in</option>
              <option value="adjustment_out">Adjustment out</option>
              <option value="transfer_in">Transfer in</option>
              <option value="transfer_out">Transfer out</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" defaultValue={defaults?.quantity ?? 1} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_cost">Unit cost</Label>
            <Input id="unit_cost" name="unit_cost" type="number" min="0" step="0.01" defaultValue={defaults?.unit_cost ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurred_at">Occurred at</Label>
            <Input id="occurred_at" name="occurred_at" type="datetime-local" defaultValue={toDateTimeInputValue(defaults?.occurred_at)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input id="reference" name="reference" defaultValue={defaults?.reference ?? ''} placeholder="PO-1042, count sheet, manual correction" />
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
