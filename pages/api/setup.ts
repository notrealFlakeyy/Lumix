import type { NextApiRequest, NextApiResponse } from 'next'

type SetupRequest = {
  businessName?: string
  email?: string
  size?: string
  region?: string
  features?: string[]
}

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  const payload = req.body as SetupRequest
  if (
    !payload.businessName ||
    !payload.email ||
    !payload.size ||
    !payload.region ||
    !Array.isArray(payload.features) ||
    payload.features.length === 0
  ) {
    res.status(400).json({ message: 'Missing required fields' })
    return
  }

  // Placeholder: in a real app we would persist to a database or CRM.
  res.status(200).json({ message: 'Setup saved', data: payload })
}
