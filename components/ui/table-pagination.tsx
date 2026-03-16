import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

export function TablePagination({
  page,
  total,
  pageSize,
  href,
}: {
  page: number
  total: number
  pageSize: number
  href: (page: number) => string
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-4">
      <p className="text-sm text-slate-500">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={href(page + 1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
