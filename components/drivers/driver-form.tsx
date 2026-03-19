import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type DriverDefaults = {
  branch_id?: string | null
  full_name?: string | null
  phone?: string | null
  email?: string | null
  license_type?: string | null
  employment_type?: string | null
  is_active?: boolean
}

type SelectOption = { value: string; label: string }

export function DriverForm({
  action,
  defaults,
  branches,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  defaults?: DriverDefaults
  branches?: SelectOption[]
  submitLabel: string
}) {
  return (
    <form action={action} className="space-y-6">
      <Card >
        <CardHeader>
          <CardTitle>Driver Details</CardTitle>
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
            <Label htmlFor="full_name">Name</Label>
            <Input id="full_name" name="full_name" defaultValue={defaults?.full_name ?? ''} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={defaults?.phone ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license_type">License Type</Label>
            <Input id="license_type" name="license_type" defaultValue={defaults?.license_type ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment_type">Employment Type</Label>
            <Input id="employment_type" name="employment_type" defaultValue={defaults?.employment_type ?? ''} />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input type="checkbox" name="is_active" defaultChecked={defaults?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" />
            Driver is active
          </label>
        </CardContent>
      </Card>
      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
