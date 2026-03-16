import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { PurchaseInvoiceForm } from '@/components/purchases/purchase-invoice-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManagePurchases } from '@/lib/auth/permissions'
import { createPurchaseInvoice } from '@/lib/db/mutations/purchases'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listInventoryProducts } from '@/lib/db/queries/inventory'
import { listPurchaseVendors } from '@/lib/db/queries/purchases'
import { purchaseInvoiceSchema, purchaseInvoiceItemSchema } from '@/lib/validations/purchase-invoice'
import { getOptionalString, getString } from '@/lib/utils/forms'

function parseInvoiceItems(formData: FormData) {
  const items = []
  for (let index = 0; index < 3; index += 1) {
    const description = getOptionalString(formData, `item_description_${index}`)
    const quantity = getOptionalString(formData, `item_quantity_${index}`)
    const unitPrice = getOptionalString(formData, `item_unit_price_${index}`)
    const vatRate = getOptionalString(formData, `item_vat_rate_${index}`)
    const inventoryProductId = getOptionalString(formData, `item_inventory_product_id_${index}`)
    if (!description) {
      continue
    }
    items.push(
      purchaseInvoiceItemSchema.parse({
        inventory_product_id: inventoryProductId,
        description,
        quantity: quantity ?? 1,
        unit_price: unitPrice ?? 0,
        vat_rate: vatRate ?? 25.5,
      }),
    )
  }
  return items
}

export default async function NewPurchaseInvoicePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'purchases')

  const [branches, vendors, products] = await Promise.all([
    listActiveBranches(membership.company_id, membership),
    listPurchaseVendors(membership.company_id, undefined, membership.branchIds),
    listInventoryProducts(membership.company_id, undefined, membership.branchIds),
  ])

  async function action(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'purchases')
    if (!canManagePurchases(membership.role)) {
      throw new Error('Insufficient permissions to manage purchase bills.')
    }

    const input = purchaseInvoiceSchema.parse({
      branch_id: getString(formData, 'branch_id'),
      vendor_id: getString(formData, 'vendor_id'),
      invoice_date: getString(formData, 'invoice_date'),
      due_date: getOptionalString(formData, 'due_date'),
      status: getString(formData, 'status'),
      reference_number: getOptionalString(formData, 'reference_number'),
      notes: getOptionalString(formData, 'notes'),
      items: parseInvoiceItems(formData),
    })

    const invoice = await createPurchaseInvoice(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/purchases`)
    revalidatePath(`/${locale}/purchases/invoices`)
    redirect(`/${locale}/purchases/invoices/${invoice.id}`)
  }

  if (branches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Purchase Bill" description="Purchase bills need a branch so receiving and invoice ownership stay branch-scoped." />
        <Card className="border-slate-200/80 bg-white/90">
          <CardContent className="space-y-4 px-6 py-6 text-sm text-slate-600">
            <p>Create at least one branch before adding purchase bills.</p>
            <Button asChild>
              <Link href="/settings/company">Open branch settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (vendors.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="New Purchase Bill" description="You need at least one vendor before creating a purchase bill." />
        <Card className="border-slate-200/80 bg-white/90">
          <CardContent className="space-y-4 px-6 py-6 text-sm text-slate-600">
            <p>Create a vendor first, then return here to add the bill.</p>
            <Button asChild>
              <Link href="/purchases/vendors">Open vendor settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="New Purchase Bill" description="Create a supplier bill and optionally link line items to inventory products for receiving." />
      <PurchaseInvoiceForm
        action={action}
        branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
        vendors={vendors.map((vendor) => ({ value: vendor.id, label: `${vendor.name} | ${vendor.branch_name}` }))}
        products={products.map((product) => ({ value: product.id, label: `${product.sku} | ${product.name} | ${product.branch_name}` }))}
      />
    </div>
  )
}
