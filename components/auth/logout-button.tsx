'use client'

import * as React from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LogoutButton({ locale }: { locale: string }) {
  const supabase = createSupabaseBrowserClient()
  const [isLoading, setIsLoading] = React.useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true)
        await supabase.auth.signOut()
        window.location.href = `/${locale}/login`
      }}
    >
      Sign out
    </Button>
  )
}
