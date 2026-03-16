import { StatCard } from '@/components/dashboard/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { getInventoryOverview } from '@/lib/db/queries/inventory'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDateTime } from '@/lib/utils/dates'
import { getInventoryMovementDirection } from '@/lib/utils/inventory'
import { toDisplayNumber } from '@/lib/utils/numbers'

export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'inventory')
  const overview = await getInventoryOverview(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventory"
        description="Branch-aware product and stock control for warehouse-heavy clients that need more than transport workflows."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/inventory/products">View products</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/products/new">New product</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={String(overview.productCount)} hint={`${overview.activeProductCount} active branch-owned SKUs`} />
        <StatCard label="Low stock items" value={String(overview.lowStockCount)} hint="Products at or below reorder level." />
        <StatCard label="Estimated stock value" value={formatCurrency(overview.stockValue)} hint="Based on current on-hand quantity and cost price." />
        <StatCard label="Movements in 30 days" value={String(overview.movementCount30d)} hint="Recent receipts, issues, adjustments, and transfers." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Low Stock Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {overview.lowStockProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Reorder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <Link href={`/inventory/products/${product.id}`} className="text-slate-950 hover:underline">
                          {product.sku}
                        </Link>
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.branch_name}</TableCell>
                      <TableCell>{toDisplayNumber(product.on_hand, 2)} {product.unit}</TableCell>
                      <TableCell>{toDisplayNumber(product.reorder_level, 2)} {product.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
                No products are currently below their reorder levels.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {overview.recentMovements.length > 0 ? (
              overview.recentMovements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-100 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-950">{movement.product_name}</div>
                      <div className="text-sm text-slate-500">{movement.sku} · {movement.branch_name}</div>
                    </div>
                    <Badge variant={getInventoryMovementDirection(movement.movement_type) === 'in' ? 'success' : 'warning'}>
                      {movement.movement_label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                    <div>{formatDateTime(movement.occurred_at)}</div>
                    <div className={movement.signed_quantity >= 0 ? 'font-medium text-emerald-700' : 'font-medium text-rose-700'}>
                      {movement.signed_quantity >= 0 ? '+' : ''}
                      {toDisplayNumber(movement.signed_quantity, 2)}
                    </div>
                  </div>
                  {movement.reference ? <div className="mt-2 text-xs text-slate-500">Ref: {movement.reference}</div> : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
                No stock movements recorded in the last 30 days.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
