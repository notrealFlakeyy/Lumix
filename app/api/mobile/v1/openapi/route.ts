import { NextResponse } from 'next/server'

import { getMobileOpenApiSpec } from '@/lib/mobile/openapi'

export async function GET() {
  return NextResponse.json(getMobileOpenApiSpec())
}
