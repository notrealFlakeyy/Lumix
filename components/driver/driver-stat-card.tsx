import { Card, CardContent } from '@/components/ui/card'

export function DriverStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-softSm">
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      </CardContent>
    </Card>
  )
}
