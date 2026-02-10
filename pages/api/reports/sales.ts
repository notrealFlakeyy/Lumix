import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

type ProductRow = {
  description: string
  quantity: number
  unit_price: number
  line_total: number
  invoices: { company_id: string }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const supabase = createPagesServerClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ message: 'You must be signed in.' })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.company_id) {
    return res.status(400).json({ message: 'Missing company profile.' })
  }

  const { data: items, error } = await supabase
    .from('invoice_items')
    .select('description, quantity, unit_price, line_total, invoices!inner(company_id)')
    .eq('invoices.company_id', profile.company_id)

  if (error) {
    return res.status(500).json({ message: 'Could not load sales data.' })
  }

  const aggregates = new Map<string, { units: number; revenue: number; avgUnit: number }>()
  let totalUnitPrice = 0
  let totalUnitCount = 0

  ;(items as ProductRow[]).forEach((item) => {
    const name = item.description || 'Unnamed'
    const units = Number(item.quantity) || 0
    const revenue = Number(item.line_total) || 0
    const unitPrice = Number(item.unit_price) || 0
    const existing = aggregates.get(name) ?? { units: 0, revenue: 0, avgUnit: 0 }
    aggregates.set(name, {
      units: existing.units + units,
      revenue: existing.revenue + revenue,
      avgUnit: 0,
    })
    totalUnitPrice += unitPrice * units
    totalUnitCount += units
  })

  const products = Array.from(aggregates.entries()).map(([name, data]) => ({
    name,
    units: data.units,
    revenue: data.revenue,
  }))

  products.sort((a, b) => b.revenue - a.revenue)
  const bestSellers = products.slice(0, 5)
  const worstSellers = products.slice(-5).reverse()
  const avgUnitPrice = totalUnitCount > 0 ? totalUnitPrice / totalUnitCount : 0

  return res.status(200).json({
    bestSellers,
    worstSellers,
    avgUnitPrice,
  })
}
