import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { InventoryProductForm } from '@/components/inventory/product-form'
import { PageHeader } from '@/components/layout/page-header'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManageInventory } from '@/lib/auth/permissions'
import { updateInventoryProduct } from '@/lib/db/mutations/inventory'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { getInventoryProductById } from '@/lib/db/queries/inventory'
import { inventoryProductSchema } from '@/lib/validations/inventory-product'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'

export default async function EditInventoryProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const { membership } = await requireModuleAccess(locale, 'inventory')

  const [productBundle, branches] = await Promise.all([
    getInventoryProductById(membership.company_id, id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
  ])

  if (!productBundle) {
    notFound()
  }

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

    await updateInventoryProduct(membership.company_id, user.id, id, input)
    revalidatePath(`/${locale}/inventory`)
    revalidatePath(`/${locale}/inventory/products`)
    revalidatePath(`/${locale}/inventory/products/${id}`)
    redirect(`/${locale}/inventory/products/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${productBundle.product.name}`} description="Update the branch assignment, costing, reorder logic, and operational notes for this SKU." />
      <InventoryProductForm
        action={action}
        branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
        defaults={productBundle.product}
        submitLabel="Save changes"
      />
    </div>
  )
}
