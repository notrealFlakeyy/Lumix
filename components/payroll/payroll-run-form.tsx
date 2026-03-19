import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Option = {
  value: string
  label: string
}

export function PayrollRunForm({
  action,
  branches,
}: {
  action: (formData: FormData) => void | Promise<void>
  branches: Option[]
}) {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  return (
    <form action={action}>
      <Card >
        <CardHeader>
          <CardTitle>Create Payroll Run</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch scope</Label>
            <select id="branch_id" name="branch_id" defaultValue="" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">All visible branches</option>
              {branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_start">Period start</Label>
            <Input id="period_start" name="period_start" type="date" defaultValue={firstDay} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period_end">Period end</Label>
            <Input id="period_end" name="period_end" type="date" defaultValue={lastDay} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Create payroll run</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
