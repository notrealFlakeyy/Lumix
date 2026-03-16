import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function validateMobileRequest<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema) {
  const payload = await request.clone().json().catch(() => ({}))
  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Invalid mobile API request payload.',
        },
        { status: 400 },
      ),
    }
  }

  return { ok: true as const, data: parsed.data }
}

export async function validateMobileResponse<TSchema extends z.ZodTypeAny>(
  responsePromise: Response | Promise<Response>,
  schema: TSchema,
) {
  const response = await responsePromise
  const payload = await response.clone().json().catch(() => null)

  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid mobile API response contract.',
      },
      { status: 500 },
    )
  }

  return NextResponse.json(parsed.data, { status: response.status })
}
