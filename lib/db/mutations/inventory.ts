import 'server-only'

import type { TableRow } from '@/types/database'
import type { InventoryMovementInput } from '@/lib/validations/inventory-movement'
import type { InventoryProductInput } from '@/lib/validations/inventory-product'

import { getCurrentMembership } from '@/lib/auth/get-current-membership'
import { ensureBranchAccess } from '@/lib/auth/branch-access'
import { getDbClient, insertAuditLog, type DbClient } from '@/lib/db/shared'
import { getInventoryMovementSignedQuantity } from '@/lib/utils/inventory'
import { toNumber } from '@/lib/utils/numbers'

async function getInventoryProductRecord(supabase: DbClient, companyId: string, productId: string) {
  const { data, error } = await supabase
    .from('inventory_products')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as TableRow<'inventory_products'> | null
}

async function getInventoryProductOnHand(supabase: DbClient, companyId: string, productId: string) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('movement_type, quantity')
    .eq('company_id', companyId)
    .eq('product_id', productId)

  if (error) {
    throw error
  }

  return ((data ?? []) as Array<Pick<TableRow<'inventory_movements'>, 'movement_type' | 'quantity'>>).reduce(
    (sum, row) => sum + getInventoryMovementSignedQuantity(row.movement_type, row.quantity),
    0,
  )
}

export async function createInventoryProduct(companyId: string, userId: string, input: InventoryProductInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, input.branch_id, 'inventory product')
  }

  const { data, error } = await supabase
    .from('inventory_products')
    .insert({
      company_id: companyId,
      ...input,
    })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const product = data as TableRow<'inventory_products'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'inventory_product',
    entity_id: product.id,
    action: 'create',
    new_values: product,
  })

  return product
}

export async function updateInventoryProduct(companyId: string, userId: string, id: string, input: InventoryProductInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const previous = await getInventoryProductRecord(supabase, companyId, id)
  if (!previous) {
    throw new Error('Inventory product not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, previous.branch_id, 'inventory product')
    ensureBranchAccess(membership, input.branch_id, 'inventory product')
  }

  if (previous.branch_id !== input.branch_id) {
    const { count, error: movementError } = await supabase
      .from('inventory_movements')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('product_id', id)

    if (movementError) {
      throw movementError
    }

    if ((count ?? 0) > 0) {
      throw new Error('Branch cannot be changed after stock movements have been recorded for this product.')
    }
  }

  const { data, error } = await supabase
    .from('inventory_products')
    .update(input)
    .eq('company_id', companyId)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const product = data as TableRow<'inventory_products'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'inventory_product',
    entity_id: id,
    action: 'update',
    old_values: previous,
    new_values: product,
  })

  return product
}

export async function recordInventoryMovement(companyId: string, userId: string, input: InventoryMovementInput, client?: DbClient) {
  const supabase = await getDbClient(client)
  const product = await getInventoryProductRecord(supabase, companyId, input.product_id)

  if (!product) {
    throw new Error('Inventory product not found.')
  }

  const { membership } = await getCurrentMembership()
  if (membership?.company_id === companyId) {
    ensureBranchAccess(membership, product.branch_id, 'inventory movement')
  }

  const currentOnHand = await getInventoryProductOnHand(supabase, companyId, product.id)
  const signedQuantity = getInventoryMovementSignedQuantity(input.movement_type, input.quantity)
  if (currentOnHand + signedQuantity < 0) {
    throw new Error('This movement would push stock below zero for the selected product.')
  }

  const payload = {
    company_id: companyId,
    branch_id: product.branch_id,
    product_id: product.id,
    movement_type: input.movement_type,
    quantity: input.quantity,
    unit_cost: input.unit_cost ?? product.cost_price,
    reference: input.reference,
    notes: input.notes,
    created_by: userId,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('inventory_movements')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const movement = data as TableRow<'inventory_movements'>
  await insertAuditLog(supabase, {
    company_id: companyId,
    user_id: userId,
    entity_type: 'inventory_movement',
    entity_id: movement.id,
    action: 'create',
    new_values: {
      ...movement,
      signed_quantity: signedQuantity,
      resulting_on_hand: toNumber(currentOnHand + signedQuantity),
    },
  })

  return movement
}
