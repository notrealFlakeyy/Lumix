import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toDateTimeInputValue } from '@/lib/utils/forms'

type SelectOption = { value: string; label: string }

type OrderDefaults = {
  branch_id?: string | null
  customer_id?: string | null
  assigned_vehicle_id?: string | null
  assigned_driver_id?: string | null
  pickup_location?: string | null
  delivery_location?: string | null
  cargo_description?: string | null
  scheduled_at?: string | null
  status?: string | null
  notes?: string | null
}

export function OrderForm({
  action,
  defaults,
  customers,
  vehicles,
  drivers,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: OrderDefaults
  customers: SelectOption[]
  vehicles: SelectOption[]
  drivers: SelectOption[]
  branches?: SelectOption[]
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
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
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={defaults?.status ?? 'planned'} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="draft">draft</option>
              <option value="planned">planned</option>
              <option value="assigned">assigned</option>
              <option value="in_progress">in progress</option>
              <option value="completed">completed</option>
              <option value="invoiced">invoiced</option>
              <option value="cancelled">cancelled</option>
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
            <Label htmlFor="assigned_vehicle_id">Vehicle</Label>
            <select id="assigned_vehicle_id" name="assigned_vehicle_id" defaultValue={defaults?.assigned_vehicle_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">Unassigned</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.value} value={vehicle.value}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assigned_driver_id">Driver</Label>
            <select id="assigned_driver_id" name="assigned_driver_id" defaultValue={defaults?.assigned_driver_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver.value} value={driver.value}>
                  {driver.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Scheduled At</Label>
            <Input id="scheduled_at" name="scheduled_at" type="datetime-local" defaultValue={toDateTimeInputValue(defaults?.scheduled_at)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cargo_description">Cargo Description</Label>
            <Textarea id="cargo_description" name="cargo_description" defaultValue={defaults?.cargo_description ?? ''} />
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
