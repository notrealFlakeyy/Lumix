'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  children,
}: {
  selectedIds: string[]
  onClearSelection: () => void
  children: ReactNode
}) {
  if (selectedIds.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700 bg-slate-900 px-6 py-3 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-slate-300 hover:text-white hover:bg-slate-800">
            Clear selection
          </Button>
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  )
}
