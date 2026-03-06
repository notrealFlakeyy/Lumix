import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportCard({
  title,
  children,
  subtitle,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-slate-200/80 bg-white/90">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
