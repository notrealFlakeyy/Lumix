import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { InventoryProductForm } from '@/components/inventory/product-form'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManageInventory } from '@/lib/auth/permissions'
import { createInventoryProduct } from '@/lib/db/mutations/inventory'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { inventoryProductSchema } from '@/lib/validations/inventory-product'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'

export default async function NewInventoryProductPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'inventory')
  const branches = await listActiveBranches(membership.company_id, membership)

  async function action(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'inventory')
    if (!canManageInventory(membership.role)) {
      throw new Error('Insufficient permissions to manage inventory.')
    }

    const input = inventoryProductSchema.parse({
      branch_id: getString(formData, 'branch_id'),
      sku: getString(formData, 'sku'),
      name: getString(formData, 'name'),
      category: getOptionalString(formData, 'category'),
      unit: getString(formData, 'unit'),
      reorder_level: getOptionalString(formData, 'reorder_level') ?? 0,
      cost_price: getOptionalString(formData, 'cost_price') ?? 0,
      sale_price: getOptionalString(formData, 'sale_price'),
      notes: getOptionalString(formData, 'notes'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await createInventoryProduct(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/inventory`)
    revalidatePath(`/${locale}/inventory/products`)
    redirect(`/${locale}/inventory/products`)
  }

  if (branches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Inventory Product" description="Inventory products need an active branch so stock stays branch-scoped from day one." />
        <Card >
          <CardContent className="space-y-4 px-6 py-6 text-sm text-muted-foreground">
            <p>Create at least one branch before adding inventory products.</p>
            <Button asChild>
              <Link href="/settings/company">Open branch settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Inventory Product" description="Add a branch-owned SKU with reorder logic, costing, and operational notes." />
      <InventoryProductForm
        action={action}
        branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
        submitLabel="Create product"
      />
    </div>
  )
}
