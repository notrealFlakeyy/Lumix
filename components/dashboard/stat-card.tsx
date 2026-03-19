import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <Card
      style={
        accent
          ? {
              background: 'linear-gradient(135deg, rgba(var(--app-accent), 0.12) 0%, rgba(var(--app-accent), 0.04) 100%)',
              boxShadow: '0 0 0 1px rgba(var(--app-accent), 0.18), 0 16px 40px rgba(95,73,52,0.07)',
            }
          : {}
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgb(var(--app-muted))' }}>
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="text-3xl font-bold tracking-tight"
          style={{ color: accent ? 'rgb(var(--app-accent))' : 'rgb(var(--app-contrast))' }}
        >
          {value}
        </div>
        {hint ? (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'rgba(var(--app-muted), 0.8)' }}>
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
