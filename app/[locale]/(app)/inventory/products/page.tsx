import { PageHeader } from '@/components/layout/page-header'
import { InventoryProductTable } from '@/components/inventory/product-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { listInventoryProducts } from '@/lib/db/queries/inventory'

export default async function InventoryProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'inventory')
  const products = await listInventoryProducts(membership.company_id, undefined, membership.branchIds)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Products"
        description="Manage branch-owned stock items, monitor reorder points, and keep the product catalog ready for warehouse clients."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/inventory">Inventory overview</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/products/new">New product</Link>
            </Button>
          </>
        }
      />
      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Product Catalogue</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {products.length > 0 ? (
            <InventoryProductTable products={products} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
              No inventory products yet. Add the first branch-owned SKU to start stock tracking.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
