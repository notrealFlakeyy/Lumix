import type { InventoryMovementType } from '@/types/app'
import type { TableRow } from '@/types/database'

import { byId, getDbClient, type DbClient } from '@/lib/db/shared'
import { normalizeBranchScope } from '@/lib/db/queries/branch-scope'
import { getInventoryMovementLabel, getInventoryMovementSignedQuantity } from '@/lib/utils/inventory'
import { toNumber } from '@/lib/utils/numbers'

type InventoryProductRow = TableRow<'inventory_products'> & {
  branch_name: string
  on_hand: number
  stock_value: number
  last_movement_at: string | null
  movement_count: number
}

type InventoryMovementRow = TableRow<'inventory_movements'> & {
  product_name: string
  sku: string
  branch_name: string
  signed_quantity: number
  movement_label: string
}

function aggregateMovementRows(rows: TableRow<'inventory_movements'>[]) {
  const stockByProduct = new Map<string, number>()
  const lastMovementByProduct = new Map<string, string>()
  const movementCountByProduct = new Map<string, number>()

  for (const row of rows) {
    stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + getInventoryMovementSignedQuantity(row.movement_type, row.quantity))
    movementCountByProduct.set(row.product_id, (movementCountByProduct.get(row.product_id) ?? 0) + 1)
    const previous = lastMovementByProduct.get(row.product_id)
    if (!previous || new Date(row.occurred_at).getTime() > new Date(previous).getTime()) {
      lastMovementByProduct.set(row.product_id, row.occurred_at)
    }
  }

  return {
    stockByProduct,
    lastMovementByProduct,
    movementCountByProduct,
  }
}

async function loadInventoryBase(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let productsQuery = supabase.from('inventory_products').select('*').eq('company_id', companyId).order('name')
  let movementsQuery = supabase.from('inventory_movements').select('*').eq('company_id', companyId).order('occurred_at', { ascending: false })

  if (branchScope) {
    productsQuery = productsQuery.in('branch_id', branchScope)
    movementsQuery = movementsQuery.in('branch_id', branchScope)
  }

  const [{ data: products }, { data: movements }, { data: branches }] = await Promise.all([
    productsQuery,
    movementsQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  return {
    products: (products ?? []) as TableRow<'inventory_products'>[],
    movements: (movements ?? []) as TableRow<'inventory_movements'>[],
    branches: byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>),
  }
}

export async function listInventoryProducts(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const { products, movements, branches } = await loadInventoryBase(companyId, client, branchIds)
  const { stockByProduct, lastMovementByProduct, movementCountByProduct } = aggregateMovementRows(movements)

  return products.map((product) => ({
    ...product,
    branch_name: branches.get(product.branch_id)?.name ?? 'Unknown branch',
    on_hand: stockByProduct.get(product.id) ?? 0,
    stock_value: (stockByProduct.get(product.id) ?? 0) * toNumber(product.cost_price),
    last_movement_at: lastMovementByProduct.get(product.id) ?? null,
    movement_count: movementCountByProduct.get(product.id) ?? 0,
  })) satisfies InventoryProductRow[]
}

export async function getInventoryProductById(companyId: string, id: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let productQuery = supabase.from('inventory_products').select('*').eq('company_id', companyId).eq('id', id)
  let movementQuery = supabase
    .from('inventory_movements')
    .select('*')
    .eq('company_id', companyId)
    .eq('product_id', id)
    .order('occurred_at', { ascending: false })

  if (branchScope) {
    productQuery = productQuery.in('branch_id', branchScope)
    movementQuery = movementQuery.in('branch_id', branchScope)
  }

  const [{ data: product }, { data: movements }, { data: branches }] = await Promise.all([
    productQuery.maybeSingle(),
    movementQuery,
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const typedProduct = product as TableRow<'inventory_products'> | null
  if (!typedProduct) {
    return null
  }

  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const typedMovements = (movements ?? []) as TableRow<'inventory_movements'>[]
  const onHand = typedMovements.reduce((sum, row) => sum + getInventoryMovementSignedQuantity(row.movement_type, row.quantity), 0)
  const inboundQuantity = typedMovements
    .filter((row) => getInventoryMovementSignedQuantity(row.movement_type, row.quantity) > 0)
    .reduce((sum, row) => sum + toNumber(row.quantity), 0)
  const outboundQuantity = typedMovements
    .filter((row) => getInventoryMovementSignedQuantity(row.movement_type, row.quantity) < 0)
    .reduce((sum, row) => sum + toNumber(row.quantity), 0)

  return {
    product: {
      ...typedProduct,
      branch_name: branchMap.get(typedProduct.branch_id)?.name ?? 'Unknown branch',
    },
    movements: typedMovements.map((row) => ({
      ...row,
      product_name: typedProduct.name,
      sku: typedProduct.sku,
      branch_name: branchMap.get(row.branch_id)?.name ?? 'Unknown branch',
      signed_quantity: getInventoryMovementSignedQuantity(row.movement_type, row.quantity),
      movement_label: getInventoryMovementLabel(row.movement_type),
    })) satisfies InventoryMovementRow[],
    metrics: {
      on_hand: onHand,
      stock_value: onHand * toNumber(typedProduct.cost_price),
      inbound_quantity: inboundQuantity,
      outbound_quantity: outboundQuantity,
    },
  }
}

export async function getInventoryOverview(companyId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const products = await listInventoryProducts(companyId, client, branchIds)
  const supabase = await getDbClient(client)
  const branchScope = normalizeBranchScope(branchIds)

  let movementQuery = supabase
    .from('inventory_movements')
    .select('*')
    .eq('company_id', companyId)
    .gte('occurred_at', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString())
    .order('occurred_at', { ascending: false })

  if (branchScope) {
    movementQuery = movementQuery.in('branch_id', branchScope)
  }

  const [{ data: recentMovements }, { data: branches }] = await Promise.all([
    movementQuery.limit(8),
    supabase.from('branches').select('id, name').eq('company_id', companyId),
  ])

  const branchMap = byId((branches ?? []) as Array<Pick<TableRow<'branches'>, 'id' | 'name'>>)
  const productMap = byId(products)
  const lowStockProducts = products
    .filter((product) => product.is_active && product.on_hand <= toNumber(product.reorder_level))
    .sort((left, right) => left.on_hand - right.on_hand)
    .slice(0, 6)

  return {
    productCount: products.length,
    activeProductCount: products.filter((product) => product.is_active).length,
    lowStockCount: lowStockProducts.length,
    stockValue: products.reduce((sum, product) => sum + product.stock_value, 0),
    movementCount30d: (recentMovements ?? []).length,
    lowStockProducts,
    recentMovements: ((recentMovements ?? []) as TableRow<'inventory_movements'>[]).map((row) => ({
      ...row,
      branch_name: branchMap.get(row.branch_id)?.name ?? 'Unknown branch',
      product_name: productMap.get(row.product_id)?.name ?? 'Unknown product',
      sku: productMap.get(row.product_id)?.sku ?? '-',
      signed_quantity: getInventoryMovementSignedQuantity(row.movement_type, row.quantity),
      movement_label: getInventoryMovementLabel(row.movement_type),
    })) satisfies InventoryMovementRow[],
  }
}

export async function getInventoryProductStock(companyId: string, productId: string, client?: DbClient, branchIds?: readonly string[] | null) {
  const product = await getInventoryProductById(companyId, productId, client, branchIds)
  return product?.metrics.on_hand ?? 0
}
