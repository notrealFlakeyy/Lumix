import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { sendContactSubmission } from '@/lib/marketing/contact'
import { contactSubmissionSchema } from '@/lib/validations/contact'

export async function POST(request: Request) {
  try {
    const payload = contactSubmissionSchema.parse(await request.json())

    if (payload.website) {
      return NextResponse.json({ ok: true })
    }

    await sendContactSubmission(payload)

    return NextResponse.json({
      ok: true,
      message: 'Thanks. Your message has been sent and we will get back to you shortly.',
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.issues[0]?.message ?? 'Please check the form fields and try again.',
        },
        { status: 400 },
      )
    }

    const message =
      error instanceof Error
        ? error.message
        : 'The contact form could not be sent right now. Please try again in a moment.'

    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}

