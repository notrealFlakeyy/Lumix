/* eslint-disable no-console */
require('../load-env')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function main() {
  const today = new Date().toISOString().slice(0, 10)

  const { data: updatedAr, error: arError } = await supabase
    .from('ar_invoices')
    .update({ status: 'overdue' })
    .eq('status', 'sent')
    .lt('due_date', today)
    .select('id')

  if (arError) throw arError

  const { data: updatedAp, error: apError } = await supabase
    .from('ap_invoices')
    .update({ status: 'overdue' })
    .in('status', ['approved', 'sent'])
    .lt('due_date', today)
    .select('id')

  if (apError) throw apError

  console.log('Marked overdue:', { ar: updatedAr?.length ?? 0, ap: updatedAp?.length ?? 0 })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
