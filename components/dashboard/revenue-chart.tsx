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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? (
          <p className="text-sm" style={{ color: 'rgb(var(--app-muted))' }}>
            {subtitle}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div
            className="rounded-xl border border-dashed px-4 py-8 text-sm"
            style={{ borderColor: 'rgba(var(--app-muted), 0.25)', color: 'rgb(var(--app-muted))' }}
          >
            No data yet.
          </div>
        ) : (
          data.slice(0, 6).map((entry) => (
            <div key={entry.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium" style={{ color: 'rgb(var(--app-contrast))' }}>
                    {entry.label}
                  </div>
                  {entry.meta ? (
                    <div className="text-xs" style={{ color: 'rgb(var(--app-muted))' }}>
                      {entry.meta}
                    </div>
                  ) : null}
                </div>
                <div className="font-semibold tabular-nums" style={{ color: 'rgb(var(--app-contrast))' }}>
                  {formatCurrency(entry.value)}
                </div>
              </div>
              {/* Bar track */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(var(--app-muted), 0.12)' }}
              >
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(6, (entry.value / maxValue) * 100)}%`,
                    background: 'linear-gradient(90deg, rgb(var(--app-accent)), rgba(var(--app-accent), 0.55))',
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
