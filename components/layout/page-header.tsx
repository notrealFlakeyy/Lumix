import { Button } from '@/components/ui/button'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: 'rgb(var(--app-contrast))' }}>{title}</h1>
        {description ? <p className="max-w-3xl text-sm leading-6" style={{ color: 'rgb(var(--app-muted))' }}>{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  )
}
