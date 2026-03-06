import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type VehicleDefaults = {
  registration_number?: string | null
  make?: string | null
  model?: string | null
  year?: number | null
  fuel_type?: string | null
  current_km?: string | number | null
  next_service_km?: string | number | null
  is_active?: boolean
}

export function VehicleForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: VehicleDefaults
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="registration_number">Registration Number</Label>
            <Input id="registration_number" name="registration_number" defaultValue={defaults?.registration_number ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel_type">Fuel Type</Label>
            <Input id="fuel_type" name="fuel_type" defaultValue={defaults?.fuel_type ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input id="make" name="make" defaultValue={defaults?.make ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={defaults?.model ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" name="year" type="number" defaultValue={defaults?.year ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_km">Current KM</Label>
            <Input id="current_km" name="current_km" type="number" step="0.01" defaultValue={defaults?.current_km ?? 0} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next_service_km">Next Service KM</Label>
            <Input id="next_service_km" name="next_service_km" type="number" step="0.01" defaultValue={defaults?.next_service_km ?? ''} />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={defaults?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" />
            Vehicle is active
          </label>
        </CardContent>
      </Card>
      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
