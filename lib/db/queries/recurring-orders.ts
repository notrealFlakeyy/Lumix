import 'server-only'

import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'

type RecurringOrderTemplate = TableRow<'recurring_order_templates'>
type RecurringOrderTemplateWithCustomerName = RecurringOrderTemplate & { customer_name: string }

export async function getRecurringOrderTemplates(
  companyId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
): Promise<RecurringOrderTemplateWithCustomerName[]> {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let templatesQuery = supabase
    .from('recurring_order_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (branchScope) {
    templatesQuery = templatesQuery.in('branch_id', branchScope)
  }

  const [{ data: templates }, { data: customers }] = await Promise.all([
    templatesQuery,
    supabase.from('customers').select('id, name').eq('company_id', companyId),
  ])

  const customerMap = byId(customers ?? [])
  const recurringTemplates = (templates ?? []) as RecurringOrderTemplate[]

  return recurringTemplates.map((template) => ({
    ...template,
    customer_name: template.customer_id ? (customerMap.get(template.customer_id)?.name ?? '-') : '-',
  }))
}

export async function getRecurringOrderTemplate(
  companyId: string,
  templateId: string,
  client?: DbClient,
  branchIds?: readonly string[] | null,
): Promise<RecurringOrderTemplate | null> {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let query = supabase
    .from('recurring_order_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', templateId)

  if (branchScope) {
    query = query.in('branch_id', branchScope)
  }

  const { data: template } = await query.maybeSingle()

  return (template as RecurringOrderTemplate | null) ?? null
}
