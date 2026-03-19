import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toDateTimeInputValue } from '@/lib/utils/forms'

type SelectOption = { value: string; label: string }

type TripDefaults = {
  branch_id?: string | null
  transport_order_id?: string | null
  customer_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  start_time?: string | null
  end_time?: string | null
  start_km?: string | number | null
  end_km?: string | number | null
  distance_km?: string | number | null
  waiting_time_minutes?: number | null
  notes?: string | null
  delivery_confirmation?: string | null
  status?: string | null
}

export function TripForm({
  action,
  defaults,
  orders,
  customers,
  vehicles,
  drivers,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: TripDefaults
  orders: SelectOption[]
  customers: SelectOption[]
  vehicles: SelectOption[]
  drivers: SelectOption[]
  branches?: SelectOption[]
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card >
        <CardHeader>
          <CardTitle>Trip Summary</CardTitle>
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
            <Label htmlFor="transport_order_id">Linked Order</Label>
            <select id="transport_order_id" name="transport_order_id" defaultValue={defaults?.transport_order_id ?? ''} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">No linked order</option>
              {orders.map((order) => (
                <option key={order.value} value={order.value}>
                  {order.label}
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
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select id="status" name="status" defaultValue={defaults?.status ?? 'planned'} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="planned">planned</option>
              <option value="started">started</option>
              <option value="completed">completed</option>
              <option value="invoiced">invoiced</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waiting_time_minutes">Waiting Time Minutes</Label>
            <Input id="waiting_time_minutes" name="waiting_time_minutes" type="number" defaultValue={defaults?.waiting_time_minutes ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time</Label>
            <Input id="start_time" name="start_time" type="datetime-local" defaultValue={toDateTimeInputValue(defaults?.start_time)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End Time</Label>
            <Input id="end_time" name="end_time" type="datetime-local" defaultValue={toDateTimeInputValue(defaults?.end_time)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_km">Start KM</Label>
            <Input id="start_km" name="start_km" type="number" step="0.01" defaultValue={defaults?.start_km ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_km">End KM</Label>
            <Input id="end_km" name="end_km" type="number" step="0.01" defaultValue={defaults?.end_km ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distance_km">Distance KM</Label>
            <Input id="distance_km" name="distance_km" type="number" step="0.01" defaultValue={defaults?.distance_km ?? ''} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="delivery_confirmation">Delivery Confirmation</Label>
            <Input id="delivery_confirmation" name="delivery_confirmation" defaultValue={defaults?.delivery_confirmation ?? ''} />
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
