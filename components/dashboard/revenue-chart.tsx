import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export function RevenueChart({
  title,
  subtitle,
  data,
}: {
  title: string
  subtitle?: string
  data: Array<{ label: string; value: number; meta?: string | null }>
}) {
  const maxValue = data.length > 0 ? Math.max(...data.map((entry) => entry.value), 1) : 1

  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No data yet.</div>
        ) : (
          data.slice(0, 6).map((entry) => (
            <div key={entry.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{entry.label}</div>
                  {entry.meta ? <div className="text-xs text-slate-500">{entry.meta}</div> : null}
                </div>
                <div className="font-medium text-slate-700">{formatCurrency(entry.value)}</div>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
                  style={{ width: `${Math.max(8, (entry.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
