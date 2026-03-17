'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Clock, FileWarning, Wrench } from 'lucide-react'

import type { Alert } from '@/lib/db/queries/alerts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const severityColor: Record<Alert['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

const severityBadgeVariant: Record<Alert['severity'], 'destructive' | 'warning' | 'default'> = {
  critical: 'destructive',
  warning: 'warning',
  info: 'default',
}

function AlertIcon({ type }: { type: Alert['type'] }) {
  const className = 'h-4 w-4 shrink-0 text-slate-500'
  switch (type) {
    case 'overdue_invoice':
      return <FileWarning className={className} />
    case 'vehicle_maintenance':
      return <Wrench className={className} />
    case 'pending_approval':
      return <Clock className={className} />
    default:
      return <AlertTriangle className={className} />
  }
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(alerts.length > 0)

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader className="pb-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-lg font-semibold">Alerts</CardTitle>
            {alerts.length > 0 && (
              <div className="flex items-center gap-1.5">
                {criticalCount > 0 && <Badge variant="destructive">{criticalCount} critical</Badge>}
                {warningCount > 0 && <Badge variant="warning">{warningCount} warning</Badge>}
                {alerts.length - criticalCount - warningCount > 0 && (
                  <Badge>{alerts.length - criticalCount - warningCount} info</Badge>
                )}
              </div>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
      </CardHeader>

      {expanded && (
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              <Bell className="h-5 w-5 text-slate-400" />
              No alerts right now. Everything looks good.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50">
              {alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="flex items-start gap-3 px-4 py-3 transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-slate-100"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor[alert.severity]}`} />
                  <AlertIcon type={alert.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">{alert.title}</span>
                      <Badge variant={severityBadgeVariant[alert.severity]} className="text-[10px] leading-tight">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{alert.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
