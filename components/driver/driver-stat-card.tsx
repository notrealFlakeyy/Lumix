import { Card, CardContent } from '@/components/ui/card'

export function DriverStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-softSm">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
      </CardContent>
    </Card>
  )
}
