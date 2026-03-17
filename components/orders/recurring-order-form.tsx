import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type SelectOption = { value: string; label: string }

type RecurringOrderDefaults = {
  branch_id?: string | null
  customer_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  pickup_location?: string | null
  delivery_location?: string | null
  cargo_description?: string | null
  notes?: string | null
  recurrence_rule?: string | null
  recurrence_day_of_week?: number | null
  recurrence_day_of_month?: number | null
  next_occurrence_date?: string | null
  is_active?: boolean | null
}

const DAY_OF_WEEK_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export function RecurringOrderForm({
  action,
  defaults,
  customers,
  vehicles,
  drivers,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: RecurringOrderDefaults
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
          <CardTitle>Template Details</CardTitle>
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
            <select
              id="customer_id"
              name="customer_id"
              defaultValue={defaults?.customer_id ?? ''}
              required
              className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.value} value={customer.value}>
                  {customer.label}
                </option>
              ))}
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
            <Label htmlFor="vehicle_id">Vehicle</Label>
            <select id="vehicle_id" name="vehicle_id" defaultValue={defaults?.vehicle_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">Unassigned</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.value} value={vehicle.value}>
                  {vehicle.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver_id">Driver</Label>
            <select id="driver_id" name="driver_id" defaultValue={defaults?.driver_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">Unassigned</option>
              {drivers.map((driver) => (
                <option key={driver.value} value={driver.value}>
                  {driver.label}
                </option>
              ))}
            </select>
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

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Recurrence Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="recurrence_rule">Frequency</Label>
            <select id="recurrence_rule" name="recurrence_rule" defaultValue={defaults?.recurrence_rule ?? 'weekly'} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_occurrence_date">Next Occurrence Date</Label>
            <Input id="next_occurrence_date" name="next_occurrence_date" type="date" defaultValue={defaults?.next_occurrence_date ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence_day_of_week">Day of Week (for weekly/biweekly)</Label>
            <select id="recurrence_day_of_week" name="recurrence_day_of_week" defaultValue={defaults?.recurrence_day_of_week?.toString() ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">Not set</option>
              {DAY_OF_WEEK_OPTIONS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence_day_of_month">Day of Month (for monthly)</Label>
            <Input id="recurrence_day_of_month" name="recurrence_day_of_month" type="number" min={1} max={31} defaultValue={defaults?.recurrence_day_of_month ?? ''} />
          </div>
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            Weekly and biweekly templates need a weekday. Monthly templates need a day of month.
          </div>
          <div className="flex items-center gap-3">
            <input id="is_active" name="is_active" type="checkbox" defaultChecked={defaults?.is_active ?? true} className="h-4 w-4 rounded border-border/35" />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
