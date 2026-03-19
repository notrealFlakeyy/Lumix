'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type InviteLinkPanelProps = {
  email: string
  inviteLink: string
  generatedAt: string
  clearAction: () => Promise<void>
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function InviteLinkPanel({ email, inviteLink, generatedAt, clearAction }: InviteLinkPanelProps) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-border/30 bg-[rgb(var(--app-surface))]">
      <CardHeader>
        <CardTitle>Manual Invite Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Generated for <span className="font-medium text-foreground">{email}</span> on {formatTimestamp(generatedAt)}.
        </div>
        <div className="space-y-2">
          <Label htmlFor="manual_invite_link">Invite URL</Label>
          <Input id="manual_invite_link" readOnly value={inviteLink} className="font-mono text-xs" />
          <p className="text-sm text-muted-foreground">Share this link through your own delivery channel if Auth invite emails are not configured yet.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={inviteLink} target="_blank" rel="noreferrer">
              Open link
            </a>
          </Button>
          <form action={clearAction}>
            <Button type="submit" variant="outline">
              Dismiss
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
