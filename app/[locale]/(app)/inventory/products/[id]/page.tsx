import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { InventoryMovementForm } from '@/components/inventory/movement-form'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManageInventory } from '@/lib/auth/permissions'
import { recordInventoryMovement } from '@/lib/db/mutations/inventory'
import { getInventoryProductById } from '@/lib/db/queries/inventory'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { datetimeLocalToIso, getOptionalString, getString } from '@/lib/utils/forms'
import { getInventoryMovementDirection } from '@/lib/utils/inventory'
import { toDisplayNumber } from '@/lib/utils/numbers'
import { inventoryMovementSchema } from '@/lib/validations/inventory-movement'

export default async function InventoryProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireModuleAccess(locale, 'inventory')
  const bundle = await getInventoryProductById(membership.company_id, id, undefined, membership.branchIds)

  if (!bundle) {
    notFound()
  }

  async function movementAction(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'inventory')
    if (!canManageInventory(membership.role)) {
      throw new Error('Insufficient permissions to manage inventory.')
    }

    const input = inventoryMovementSchema.parse({
      product_id: getString(formData, 'product_id'),
      movement_type: getString(formData, 'movement_type'),
      quantity: getString(formData, 'quantity'),
      unit_cost: getOptionalString(formData, 'unit_cost'),
      reference: getOptionalString(formData, 'reference'),
      notes: getOptionalString(formData, 'notes'),
      occurred_at: datetimeLocalToIso(getOptionalString(formData, 'occurred_at')),
    })

    await recordInventoryMovement(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/inventory`)
    revalidatePath(`/${locale}/inventory/products`)
    revalidatePath(`/${locale}/inventory/products/${id}`)
    redirect(`/${locale}/inventory/products/${id}`)
  }

  const product = bundle.product

  return (
    <div className="space-y-8">
      <PageHeader
        title={product.name}
        description={`Branch-owned inventory item ${product.sku} tracked in ${product.branch_name}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/inventory/products">Back to products</Link>
            </Button>
            {canManageInventory(membership.role) ? (
              <Button asChild>
                <Link href={`/inventory/products/${product.id}/edit`}>Edit product</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="On hand" value={`${toDisplayNumber(bundle.metrics.on_hand, 2)} ${product.unit}`} hint={`Reorder level ${toDisplayNumber(product.reorder_level, 2)} ${product.unit}`} />
        <StatCard label="Stock value" value={formatCurrency(bundle.metrics.stock_value)} hint="Estimated from current stock and cost price." />
        <StatCard label="Inbound quantity" value={`${toDisplayNumber(bundle.metrics.inbound_quantity, 2)} ${product.unit}`} hint="Total receipts and positive adjustments." />
        <StatCard label="Outbound quantity" value={`${toDisplayNumber(bundle.metrics.outbound_quantity, 2)} ${product.unit}`} hint="Total issues and negative adjustments." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Product Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div><span className="font-medium text-slate-900">SKU:</span> {product.sku}</div>
            <div><span className="font-medium text-slate-900">Branch:</span> {product.branch_name}</div>
            <div><span className="font-medium text-slate-900">Category:</span> {product.category ?? '-'}</div>
            <div><span className="font-medium text-slate-900">Unit:</span> {product.unit}</div>
            <div><span className="font-medium text-slate-900">Cost price:</span> {formatCurrency(Number(product.cost_price))}</div>
            <div><span className="font-medium text-slate-900">Sale price:</span> {product.sale_price ? formatCurrency(Number(product.sale_price)) : '-'}</div>
            <div><span className="font-medium text-slate-900">Status:</span> {product.is_active ? 'Active' : 'Inactive'}</div>
            <div><span className="font-medium text-slate-900">Reorder level:</span> {toDisplayNumber(product.reorder_level, 2)} {product.unit}</div>
            <div className="md:col-span-2"><span className="font-medium text-slate-900">Notes:</span> {product.notes ?? '-'}</div>
          </CardContent>
        </Card>

        {canManageInventory(membership.role) ? (
          <InventoryMovementForm action={movementAction} productId={product.id} submitLabel="Record movement" />
        ) : null}
      </div>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Movement History</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bundle.movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.occurred_at)}</TableCell>
                    <TableCell>
                      <Badge variant={getInventoryMovementDirection(movement.movement_type) === 'in' ? 'success' : 'warning'}>
                        {movement.movement_label}
                      </Badge>
                    </TableCell>
                    <TableCell>{movement.reference ?? '-'}</TableCell>
                    <TableCell className={movement.signed_quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {movement.signed_quantity >= 0 ? '+' : ''}
                      {toDisplayNumber(movement.signed_quantity, 2)} {product.unit}
                    </TableCell>
                    <TableCell>{movement.unit_cost ? formatCurrency(Number(movement.unit_cost)) : '-'}</TableCell>
                    <TableCell>{movement.notes ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
              No stock movements recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
