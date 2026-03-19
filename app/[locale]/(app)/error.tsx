'use client'

import { AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Card className="w-full max-w-md ">
        <CardContent className="flex flex-col items-center gap-4 px-8 py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">An unexpected error occurred. Please try again.</p>
          </div>
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
