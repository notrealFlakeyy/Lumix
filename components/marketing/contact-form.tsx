'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { serviceInterestOptions } from '@/components/marketing/content'

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm() {
  const [status, setStatus] = useState<SubmissionState>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    setStatus('submitting')
    setMessage('')

    const payload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      company: String(formData.get('company') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      serviceInterest: String(formData.get('serviceInterest') ?? ''),
      message: String(formData.get('message') ?? ''),
      website: String(formData.get('website') ?? ''),
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { ok: boolean; message?: string }

      if (!response.ok || !result.ok) {
        setStatus('error')
        setMessage(result.message ?? 'The form could not be sent. Please try again.')
        return
      }

      form.reset()
      setStatus('success')
      setMessage(result.message ?? 'Thanks. We will get back to you shortly.')
    } catch {
      setStatus('error')
      setMessage('The form could not be sent. Please check your connection and try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Your name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@company.com" required />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" name="company" placeholder="Company name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" placeholder="+358 ..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceInterest">What are you most interested in?</Label>
        <select
          id="serviceInterest"
          name="serviceInterest"
          defaultValue=""
          className="flex h-11 w-full rounded-lg border border-border/35 bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Choose a focus area</option>
          {serviceInterestOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">What do you want to improve?</Label>
        <Textarea
          id="message"
          name="message"
          required
          placeholder="Tell us about your current workflow, bottlenecks, or what you want the platform to handle."
        />
      </div>

      <div className="hidden">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" autoComplete="off" tabIndex={-1} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[rgb(var(--app-muted))]">We use this form for inbound project and product enquiries.</p>
        <Button type="submit" size="lg" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending...' : 'Send message'}
        </Button>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm font-medium">
        {status === 'success' ? <p className="text-emerald-700">{message}</p> : null}
        {status === 'error' ? <p className="text-rose-700">{message}</p> : null}
      </div>
    </form>
  )
}

