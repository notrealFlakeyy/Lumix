/* eslint-disable no-console */
require('./load-env')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`)
  if (idx === -1) return undefined
  return args[idx + 1]
}

const seedEmail = process.env.SEED_EMAIL || getArg('email')
const seedPassword = process.env.SEED_PASSWORD || getArg('password')
const seedOrgName = process.env.SEED_ORG_NAME || getArg('org') || 'Demo Oy'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!seedEmail || !seedPassword) {
  console.error('Missing seed credentials. Provide env vars or CLI args:')
  console.error('  PowerShell:  $env:SEED_EMAIL=\"demo@example.com\"; $env:SEED_PASSWORD=\"...\"; npm run seed:demo')
  console.error('  Or:          npm run seed:demo -- --email demo@example.com --password \"...\" --org \"Demo Oy\"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const defaultFinnishCoA = [
  { number: '1700', name: 'Myyntisaamiset', type: 'asset' },
  { number: '1910', name: 'Pankkitili', type: 'asset' },
  { number: '1570', name: 'ALV-saamiset', type: 'asset' },
  { number: '2400', name: 'Ostovelat', type: 'liability' },
  { number: '2930', name: 'ALV-velat', type: 'liability' },
  { number: '3000', name: 'Myynti', type: 'income' },
  { number: '4000', name: 'Ostot ja kulut', type: 'expense' },
  { number: '5000', name: 'Palkat', type: 'expense' },
]

async function main() {
  const { data: userResult, error: userError } = await supabase.auth.admin.createUser({
    email: seedEmail,
    password: seedPassword,
    email_confirm: true,
  })
  if (userError) throw userError

  const userId = userResult.user.id

  const { data: org, error: orgError } = await supabase.from('organizations').insert({ name: seedOrgName }).select('id').single()
  if (orgError) throw orgError

  const orgId = org.id

  const { error: memberError } = await supabase.from('org_members').insert({ org_id: orgId, user_id: userId, role: 'owner' })
  if (memberError) throw memberError

  const { error: accountsError } = await supabase.from('gl_accounts').insert(
    defaultFinnishCoA.map((a) => ({ org_id: orgId, number: a.number, name: a.name, type: a.type })),
  )
  if (accountsError) throw accountsError

  await supabase.from('accounting_locks').insert({ org_id: orgId })

  const { data: customer } = await supabase
    .from('ar_customers')
    .insert({ org_id: orgId, name: 'Demo Asiakas', email: 'demo.customer@example.com' })
    .select('id')
    .single()

  const { data: vendor } = await supabase
    .from('ap_vendors')
    .insert({ org_id: orgId, name: 'Demo Toimittaja', email: 'demo.vendor@example.com' })
    .select('id')
    .single()

  if (customer?.id) {
    const { data: inv } = await supabase
      .from('ar_invoices')
      .insert({
        org_id: orgId,
        customer_id: customer.id,
        invoice_number: `INV-DEMO-${Date.now()}`,
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        subtotal: 100,
        vat_total: 24,
        total: 124,
        status: 'draft',
      })
      .select('id')
      .single()

    if (inv?.id) {
      await supabase.from('ar_invoice_lines').insert({
        org_id: orgId,
        invoice_id: inv.id,
        description: 'Demo palvelu',
        quantity: 1,
        unit_price: 100,
        vat_rate: 24,
        line_subtotal: 100,
        line_vat: 24,
        line_total: 124,
      })
    }
  }

  if (vendor?.id) {
    const { data: ap } = await supabase
      .from('ap_invoices')
      .insert({
        org_id: orgId,
        vendor_id: vendor.id,
        vendor_invoice_number: `AP-DEMO-${Date.now()}`,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        subtotal: 50,
        vat_total: 12,
        total: 62,
        status: 'draft',
      })
      .select('id')
      .single()

    if (ap?.id) {
      await supabase.from('ap_invoice_lines').insert({
        org_id: orgId,
        invoice_id: ap.id,
        description: 'Tarvikkeet',
        quantity: 1,
        unit_price: 50,
        vat_rate: 24,
        expense_account_no: '4000',
        vat_account_no: '1570',
        line_subtotal: 50,
        line_vat: 12,
        line_total: 62,
      })
    }
  }

  console.log('Seed complete:', { orgId, userId, email: seedEmail })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
