import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Option = {
  value: string
  label: string
}

export function WorkforceEmployeeForm({
  action,
  branches,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>
  branches: Option[]
  users: Option[]
}) {
  return (
    <form action={action}>
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Create Employee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="branch_id">Branch</Label>
            <select id="branch_id" name="branch_id" defaultValue={branches[0]?.value} className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              {branches.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth_user_id">Linked login</Label>
            <select id="auth_user_id" name="auth_user_id" defaultValue="" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="">No linked login</option>
              {users.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Job title</Label>
            <Input id="job_title" name="job_title" placeholder="Driver, Warehouse Operator, Dispatcher" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employment_type">Employment type</Label>
            <Input id="employment_type" name="employment_type" placeholder="Full-time, part-time, contractor" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay_type">Pay type</Label>
            <select id="pay_type" name="pay_type" defaultValue="hourly" className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 text-sm">
              <option value="hourly">Hourly</option>
              <option value="salary">Salary</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">Hourly rate</Label>
            <Input id="hourly_rate" name="hourly_rate" type="number" min="0" step="0.01" defaultValue="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overtime_rate">Overtime rate</Label>
            <Input id="overtime_rate" name="overtime_rate" type="number" min="0" step="0.01" placeholder="Defaults to 1.5x hourly" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Create employee</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
