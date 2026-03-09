'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function DriverInstallPrompt() {
  const [installEvent, setInstallEvent] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = React.useState(false)
  const [isStandalone, setIsStandalone] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))

    setIsIos(ios)
    setIsStandalone(standalone)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (isStandalone) {
    return null
  }

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice.catch(() => null)
    setInstallEvent(null)
  }

  if (!installEvent && !isIos) {
    return null
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
      <CardContent className="space-y-3 p-4 text-sm text-slate-600">
        <div className="font-medium text-slate-900">Install driver app</div>
        {installEvent ? (
          <>
            <p>Add this workflow to the home screen for quicker access, cleaner full-screen navigation, and a more app-like handoff during live operations.</p>
            <Button type="button" onClick={handleInstall} className="w-full">
              Install on this device
            </Button>
          </>
        ) : (
          <p>
            On iPhone or iPad, use Safari’s Share menu and choose <span className="font-medium text-slate-900">Add to Home Screen</span> to install the driver workflow.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
