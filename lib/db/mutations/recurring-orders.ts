import 'server-only'

import type { RecurringOrderInput } from '@/lib/validations/recurring-order'

import { getDbClient, getNextDocumentNumber, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function createRecurringOrderTemplate(companyId: string, userId: string, input: RecurringOrderInput, client?: DbClient) {
  const supabase = await getDbClient(client)

  const { data, error } = await supabase
    .from('recurring_order_templates')
    .insert({
      company_id: companyId,
      ...input,
    })
    .select('*')
    .single()

  if (error) throw error

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'recurring_order_template',
    entity_id: data.id,
    action: 'create',
    new_values: data,
  })

  return data
}

export async function updateRecurringOrderTemplate(companyId: string, userId: string, templateId: string, input: RecurringOrderInput, client?: DbClient) {
  const supabase = await getDbClient(client)

  const { data: previous } = await supabase
    .from('recurring_order_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', templateId)
    .maybeSingle()

  const { data, error } = await supabase
    .from('recurring_order_templates')
    .update(input)
    .eq('company_id', companyId)
    .eq('id', templateId)
    .select('*')
    .single()

  if (error) throw error

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'recurring_order_template',
    entity_id: templateId,
    action: 'update',
    old_values: previous,
    new_values: data,
  })

  return data
}

export async function deleteRecurringOrderTemplate(companyId: string, userId: string, templateId: string, client?: DbClient) {
  const supabase = await getDbClient(client)

  const { data: previous } = await supabase
    .from('recurring_order_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', templateId)
    .maybeSingle()

  const { error } = await supabase
    .from('recurring_order_templates')
    .delete()
    .eq('company_id', companyId)
    .eq('id', templateId)

  if (error) throw error

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'recurring_order_template',
    entity_id: templateId,
    action: 'delete',
    old_values: previous,
  })
}

function computeNextOccurrence(currentDate: string, rule: string, dayOfWeek?: number | null, dayOfMonth?: number | null): string {
  const date = new Date(currentDate + 'T00:00:00Z')

  switch (rule) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1)
      break
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'biweekly':
      date.setUTCDate(date.getUTCDate() + 14)
      break
    case 'monthly': {
      date.setUTCMonth(date.getUTCMonth() + 1)
      if (dayOfMonth) {
        const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
        date.setUTCDate(Math.min(dayOfMonth, lastDay))
      }
      break
    }
  }

  return date.toISOString().slice(0, 10)
}

export async function generateOrdersFromTemplates(companyId: string, client?: DbClient) {
  const supabase = await getDbClient(client)
  const today = new Date().toISOString().slice(0, 10)

  const { data: templates, error: fetchError } = await supabase
    .from('recurring_order_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .lte('next_occurrence_date', today)

  if (fetchError) throw fetchError
  if (!templates || templates.length === 0) return 0

  let generated = 0

  for (const template of templates) {
    const orderNumber = await getNextDocumentNumber(supabase, 'transport_orders', companyId, 'ORD')

    const orderInput: Record<string, unknown> = {
      company_id: companyId,
      order_number: orderNumber,
      pickup_location: template.pickup_location,
      delivery_location: template.delivery_location,
      cargo_description: template.cargo_description,
      notes: template.notes,
      status: 'planned',
      scheduled_at: new Date(template.next_occurrence_date + 'T08:00:00Z').toISOString(),
    }

    if (template.customer_id) orderInput.customer_id = template.customer_id
    if (template.branch_id) orderInput.branch_id = template.branch_id
    if (template.vehicle_id) orderInput.assigned_vehicle_id = template.vehicle_id
    if (template.driver_id) orderInput.assigned_driver_id = template.driver_id

    const { error: insertError } = await supabase
      .from('transport_orders')
      .insert(orderInput)

    if (insertError) {
      console.error(`Failed to generate order from template ${template.id}:`, insertError.message)
      continue
    }

    const nextDate = computeNextOccurrence(
      template.next_occurrence_date,
      template.recurrence_rule,
      template.recurrence_day_of_week,
      template.recurrence_day_of_month,
    )

    await supabase
      .from('recurring_order_templates')
      .update({
        next_occurrence_date: nextDate,
        last_generated_at: new Date().toISOString(),
      })
      .eq('id', template.id)

    generated++
  }

  return generated
}
