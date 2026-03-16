import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { PurchaseVendorForm } from '@/components/purchases/vendor-form'
import { PurchaseVendorTable } from '@/components/purchases/vendor-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireModuleAccess } from '@/lib/auth/require-module-access'
import { canManagePurchases } from '@/lib/auth/permissions'
import { createPurchaseVendor } from '@/lib/db/mutations/purchases'
import { listActiveBranches } from '@/lib/db/queries/branches'
import { listPurchaseVendors } from '@/lib/db/queries/purchases'
import { purchaseVendorSchema } from '@/lib/validations/purchase-vendor'
import { getCheckboxValue, getOptionalString, getString } from '@/lib/utils/forms'

export default async function PurchaseVendorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { membership } = await requireModuleAccess(locale, 'purchases')

  const [vendors, branches] = await Promise.all([
    listPurchaseVendors(membership.company_id, undefined, membership.branchIds),
    listActiveBranches(membership.company_id, membership),
  ])

  async function action(formData: FormData) {
    'use server'

    const { membership, user } = await requireModuleAccess(locale, 'purchases')
    if (!canManagePurchases(membership.role)) {
      throw new Error('Insufficient permissions to manage vendors.')
    }

    const input = purchaseVendorSchema.parse({
      branch_id: getString(formData, 'branch_id'),
      name: getString(formData, 'name'),
      business_id: getOptionalString(formData, 'business_id'),
      email: getOptionalString(formData, 'email'),
      phone: getOptionalString(formData, 'phone'),
      address_line1: getOptionalString(formData, 'address_line1'),
      city: getOptionalString(formData, 'city'),
      notes: getOptionalString(formData, 'notes'),
      is_active: getCheckboxValue(formData, 'is_active'),
    })

    await createPurchaseVendor(membership.company_id, user.id, input)
    revalidatePath(`/${locale}/purchases`)
    revalidatePath(`/${locale}/purchases/vendors`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors" description="Manage branch-aware suppliers for purchase bills, inbound stock, fuel, subcontracting, and warehouse procurement." />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {branches.length > 0 ? (
          <PurchaseVendorForm
            action={action}
            branches={branches.map((branch) => ({ value: branch.id, label: `${branch.name}${branch.code ? ` (${branch.code})` : ''}` }))}
          />
        ) : (
          <Card className="border-slate-200/80 bg-white/90">
            <CardHeader>
              <CardTitle>No branches configured</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Create at least one branch before adding vendors to the purchases module.</CardContent>
          </Card>
        )}

        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Vendor Directory</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {vendors.length > 0 ? (
              <PurchaseVendorTable vendors={vendors} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-sm text-slate-500">
                No vendors yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
