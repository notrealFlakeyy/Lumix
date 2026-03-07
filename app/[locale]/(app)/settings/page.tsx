import { revalidatePath } from 'next/cache'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { canManageSettings } from '@/lib/auth/permissions'
import { requireCompany } from '@/lib/auth/require-company'
import type { TableRow as DbTableRow } from '@/types/database'
import { getOptionalString, getString } from '@/lib/utils/forms'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { supabase, membership } = await requireCompany(locale)

  const [company, memberships, profiles] = await Promise.all([
    supabase.from('companies').select('*').eq('id', membership.company_id).single(),
    supabase.from('company_users').select('user_id, role, is_active, created_at').eq('company_id', membership.company_id).order('created_at'),
    supabase.from('profiles').select('id, full_name, phone'),
  ])
  const companyData = company.data as DbTableRow<'companies'> | null
  if (!companyData) return null

  async function updateCompanyAction(formData: FormData) {
    'use server'

    const { supabase, membership } = await requireCompany(locale)
    if (!canManageSettings(membership.role)) throw new Error('Insufficient permissions.')

    await supabase
      .from('companies')
      .update({
        name: getString(formData, 'name'),
        business_id: getOptionalString(formData, 'business_id'),
        vat_number: getOptionalString(formData, 'vat_number'),
        email: getOptionalString(formData, 'email'),
        phone: getOptionalString(formData, 'phone'),
        address_line1: getOptionalString(formData, 'address_line1'),
        address_line2: getOptionalString(formData, 'address_line2'),
        postal_code: getOptionalString(formData, 'postal_code'),
        city: getOptionalString(formData, 'city'),
        country: getOptionalString(formData, 'country') ?? 'FI',
        timezone: getOptionalString(formData, 'timezone') ?? 'Europe/Helsinki',
      })
      .eq('id', membership.company_id)

    revalidatePath(`/${locale}/settings`)
  }

  const profileMap = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]))

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Company configuration, team visibility, and implementation notes for storage and access setup." />

      <form action={updateCompanyAction}>
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Company Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" name="name" defaultValue={companyData.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_id">Business ID</Label>
              <Input id="business_id" name="business_id" defaultValue={companyData.business_id ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input id="vat_number" name="vat_number" defaultValue={companyData.vat_number ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" defaultValue={companyData.email ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={companyData.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" name="address_line1" defaultValue={companyData.address_line1 ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input id="address_line2" name="address_line2" defaultValue={companyData.address_line2 ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input id="postal_code" name="postal_code" defaultValue={companyData.postal_code ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={companyData.city ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={companyData.country} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue={companyData.timezone} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save company details</Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card className="border-slate-200/80 bg-white/90">
        <CardHeader>
          <CardTitle>Team Memberships</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(memberships.data ?? []).map((member) => {
                const profile = profileMap.get(member.user_id)
                return (
                  <TableRow key={member.user_id}>
                    <TableCell>{profile?.full_name ?? member.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell>{member.is_active ? 'Active' : 'Inactive'}</TableCell>
                    <TableCell>{member.created_at.slice(0, 10)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>App Configuration Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>This MVP enforces authenticated dashboard access, company-aware data filtering, and starter role checks.</p>
            <p>RLS is intentionally a foundation. Tighten company membership functions and driver-specific update rules before production rollout.</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white/90">
          <CardHeader>
            <CardTitle>Document Storage Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>The `documents` table is ready for metadata and demo preparation.</p>
            <p>The mobile driver workflow expects a Supabase Storage bucket named `transport-documents` for POD and receipt uploads.</p>
            <p>Signed uploads are now wired for the driver portal, but bucket rules and object-level access policies still need manual completion before production file handling is finished.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
