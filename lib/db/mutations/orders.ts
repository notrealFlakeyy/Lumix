import 'server-only'

import type { TableRow } from '@/types/database'
import type { OrderStatus } from '@/types/app'
import type { OrderInput } from '@/lib/validations/order'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, getNextDocumentNumber, insertAuditLog, type DbClient } from '@/lib/db/shared'

export async function createOrder(companyId: string, userId: string, input: OrderInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'order')
  }
  const orderNumber = await getNextDocumentNumber(supabase, 'transport_orders', companyId, 'ORD')
  const { data, error } = await supabase
    .from('transport_orders')
    .insert({
      company_id: companyId,
      created_by: userId,
      order_number: orderNumber,
      ...input,
    })
    .select('*')
    .single()

  if (error) throw error

  const order = data as TableRow<'transport_orders'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'transport_order',
    entity_id: order.id,
    action: 'create',
    new_values: order,
  })

  return order
}

export async function updateOrder(companyId: string, userId: string, id: string, input: OrderInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'order')
  }
  const { data: previous } = await supabase.from('transport_orders').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const { data, error } = await supabase
    .from('transport_orders')
    .update(input)
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const order = data as TableRow<'transport_orders'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'transport_order',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: order,
  })

  return order
}

export async function updateOrderStatus(companyId: string, userId: string, id: string, status: OrderStatus, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { data: previous } = await supabase.from('transport_orders').select('*').eq('company_id', companyId).eq('id', id).maybeSingle()
  const previousOrder = previous as TableRow<'transport_orders'> | null
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, previousOrder?.branch_id ?? null, 'order')
  }
  const { data, error } = await supabase
    .from('transport_orders')
    .update({ status })
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  const order = data as TableRow<'transport_orders'>

  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'transport_order',
    entity_id: id,
    action: 'status_change',
    old_values: previousOrder,
    new_values: order,
  })

  return order
}
