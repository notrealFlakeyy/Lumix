'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { PenLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/utils/dates'

type DriverProofOfDeliveryCardProps = {
  tripId: string
  currentRecipientName?: string | null
  currentConfirmation?: string | null
  currentReceivedAt?: string | null
}

export function DriverProofOfDeliveryCard({
  tripId,
  currentRecipientName,
  currentConfirmation,
  currentReceivedAt,
}: DriverProofOfDeliveryCardProps) {
  const router = useRouter()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = React.useRef(false)
  const hasSignatureRef = React.useRef(false)
  const [recipientName, setRecipientName] = React.useState(currentRecipientName ?? '')
  const [confirmation, setConfirmation] = React.useState(currentConfirmation ?? '')
  const [hasSignature, setHasSignature] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = typeof window === 'undefined' ? 1 : Math.max(window.devicePixelRatio || 1, 1)
    const bounds = canvas.getBoundingClientRect()
    const width = Math.max(Math.floor(bounds.width), 320)
    const height = 180

    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    const context = canvas.getContext('2d')
    if (!context) return

    context.scale(ratio, ratio)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#0f172a'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }, [])

  React.useEffect(() => {
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [resizeCanvas])

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const point = getPoint(event)
    const context = canvas?.getContext('2d')
    if (!canvas || !point || !context) return

    event.preventDefault()
    canvas.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const point = getPoint(event)
    const context = canvasRef.current?.getContext('2d')
    if (!point || !context) return

    event.preventDefault()
    context.lineTo(point.x, point.y)
    context.stroke()
    if (!hasSignatureRef.current) {
      hasSignatureRef.current = true
      setHasSignature(true)
    }
  }

  function stopDrawing(event?: React.PointerEvent<HTMLCanvasElement>) {
    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId)
    }
    isDrawingRef.current = false
  }

  function clearSignature() {
    resizeCanvas()
    hasSignatureRef.current = false
    setHasSignature(false)
  }

  async function submitProof() {
    setError(null)
    setMessage(null)

    if (!recipientName.trim()) {
      setError('Recipient name is required.')
      return
    }

    if (!confirmation.trim()) {
      setError('Delivery confirmation is required.')
      return
    }

    if (!hasSignatureRef.current || !canvasRef.current) {
      setError('Recipient signature is required.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/driver/trips/${tripId}/delivery-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_recipient_name: recipientName.trim(),
          delivery_confirmation: confirmation.trim(),
          signature_data_url: canvasRef.current.toDataURL('image/png'),
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setError(result?.error ?? 'Unable to save proof of delivery.')
        return
      }

      setMessage('Proof of delivery saved successfully.')
      clearSignature()
      router.refresh()
    } catch {
      setError('Proof of delivery requires connectivity right now.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-slate-200/80 bg-white/95 shadow-softSm">
      <CardHeader className="pb-4">
        <CardTitle>Proof of delivery</CardTitle>
        <CardDescription>Capture the receiver name, delivery note, and a signature that is stored as a trip document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentReceivedAt || currentRecipientName || currentConfirmation ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <div className="font-medium text-slate-950">Current delivery proof</div>
            <div className="mt-2">Recipient: {currentRecipientName ?? 'Not recorded'}</div>
            <div className="mt-1">Confirmation: {currentConfirmation ?? 'Not recorded'}</div>
            <div className="mt-1">Captured: {formatDateTime(currentReceivedAt)}</div>
          </div>
        ) : null}

        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{message}</div> : null}
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">{error}</div> : null}

        <div className="space-y-2">
          <Label htmlFor="delivery_recipient_name">Recipient name</Label>
          <Input
            id="delivery_recipient_name"
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="Warehouse receiver or site contact"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="delivery_confirmation_note">Delivery confirmation</Label>
          <Textarea
            id="delivery_confirmation_note"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Delivered in full, pallets counted, receiver accepted without remarks."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="delivery_signature">Recipient signature</Label>
            <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>
              Clear
            </Button>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-2">
            <canvas
              id="delivery_signature"
              ref={canvasRef}
              className="h-[180px] w-full touch-none rounded-xl bg-white"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <PenLine className="h-3.5 w-3.5" />
            <span>{hasSignature ? 'Signature captured. Save to attach it to this trip.' : 'Ask the receiver to sign in the box above.'}</span>
          </div>
        </div>

        <Button type="button" className="w-full" disabled={isLoading} onClick={submitProof}>
          {isLoading ? 'Saving proof...' : 'Save proof of delivery'}
        </Button>
      </CardContent>
    </Card>
  )
}
