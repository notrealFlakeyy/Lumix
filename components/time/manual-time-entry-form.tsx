import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toDateTimeInputValue } from '@/lib/utils/forms'

type Option = {
  value: string
  label: string
}

export function ManualTimeEntryForm({
  action,
  employees,
}: {
  action: (formData: FormData) => void | Promise<void>
  employees: Option[]
}) {
  return (
    <form action={action}>
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Manual Time Entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="employee_id">Employee</Label>
            <select id="employee_id" name="employee_id" defaultValue={employees[0]?.value} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              {employees.map((employee) => (
                <option key={employee.value} value={employee.value}>
                  {employee.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_time">Start time</Label>
            <Input id="start_time" name="start_time" type="datetime-local" defaultValue={toDateTimeInputValue(new Date().toISOString())} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End time</Label>
            <Input id="end_time" name="end_time" type="datetime-local" defaultValue={toDateTimeInputValue(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString())} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="break_minutes">Break minutes</Label>
            <Input id="break_minutes" name="break_minutes" type="number" min="0" step="1" defaultValue="30" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Create approved entry</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
