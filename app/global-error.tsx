'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-5 px-6">
          <div className="text-xs uppercase tracking-[0.2em] text-sky-300">System Error</div>
          <h1 className="text-3xl font-semibold">The workspace hit an unexpected error.</h1>
          <p className="max-w-xl text-sm text-slate-300">
            The failure has been captured for monitoring when Sentry is configured. You can retry this screen or return to the dashboard.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-foreground"
            >
              Try again
            </button>
            <a href="/fi/dashboard" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-medium text-white">
              Back to dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
