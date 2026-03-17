import { Plus } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { requireCompany } from '@/lib/auth/require-company'
import { getRecurringOrderTemplates } from '@/lib/db/queries/recurring-orders'

export default async function RecurringOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireCompany(locale)
  const templates = await getRecurringOrderTemplates(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Orders"
        description="Manage recurring order templates that automatically generate transport orders."
        actions={
          <Button asChild>
            <Link href="/orders/recurring/new">
              <Plus className="mr-2 h-4 w-4" />
              New template
            </Link>
          </Button>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardContent className="pt-6">
          {templates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Pickup</th>
                    <th className="px-3 py-3">Delivery</th>
                    <th className="px-3 py-3">Frequency</th>
                    <th className="px-3 py-3">Next Date</th>
                    <th className="px-3 py-3">Active</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {templates.map((template) => (
                    <tr key={template.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-3">{template.customer_name}</td>
                      <td className="px-3 py-3 max-w-[200px] truncate">{template.pickup_location}</td>
                      <td className="px-3 py-3 max-w-[200px] truncate">{template.delivery_location}</td>
                      <td className="px-3 py-3 capitalize">{template.recurrence_rule}</td>
                      <td className="px-3 py-3">{template.next_occurrence_date}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${template.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {template.is_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/orders/recurring/${template.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
              No recurring order templates yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
