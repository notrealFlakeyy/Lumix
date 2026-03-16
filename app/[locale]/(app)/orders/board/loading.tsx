import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-11 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-7 w-24 rounded-full" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
