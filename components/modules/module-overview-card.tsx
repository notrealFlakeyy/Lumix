import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ModuleOverviewCard({
  title,
  subtitle,
  summary,
  branchCount,
  highlights,
}: {
  title: string
  subtitle: string
  summary: string
  branchCount: number
  highlights: string[]
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Enabled Module</div>
            <CardTitle className="mt-2">{title}</CardTitle>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="font-medium text-slate-900">Why this exists</div>
          <p className="mt-2 leading-6">{summary}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {highlights.map((highlight) => (
            <div key={highlight} className="rounded-xl border border-slate-100 px-4 py-3">
              {highlight}
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-4 text-slate-700">
          Branch foundation: this company currently has <span className="font-semibold text-slate-950">{branchCount}</span> configured branch
          {branchCount === 1 ? '' : 'es'}. Future data screens can be scoped by those branch assignments without creating a separate app per niche.
        </div>
      </CardContent>
    </Card>
  )
}
