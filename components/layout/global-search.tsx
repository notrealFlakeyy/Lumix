'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Search, Truck, Car, User, Users } from 'lucide-react'

import { globalSearch, type SearchResult, type SearchResultType } from '@/lib/db/queries/search'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const typeConfig: Record<SearchResultType, { label: string; icon: typeof Search }> = {
  customer: { label: 'Customers', icon: Users },
  order: { label: 'Orders', icon: Truck },
  invoice: { label: 'Invoices', icon: FileText },
  vehicle: { label: 'Vehicles', icon: Car },
  driver: { label: 'Drivers', icon: User },
}

export function GlobalSearch({
  companyId,
  branchIds,
  locale,
}: {
  companyId: string
  branchIds: string[] | null
  locale: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  // Debounced search
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!value.trim()) {
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await globalSearch(companyId, value, branchIds, locale)
          setResults(data)
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [companyId, branchIds, locale],
  )

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      router.push(result.href)
    },
    [router],
  )

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {})

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
          Ctrl+K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-0 p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 border-b border-border/25 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search customers, orders, invoices..."
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
          </div>

          <div className="max-h-[320px] overflow-y-auto px-2 py-2">
            {!query.trim() && (
              <div className="px-3 py-8 text-center text-sm text-slate-400">Type to search across all entities</div>
            )}

            {query.trim() && !loading && results.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-slate-400">No results found for &quot;{query}&quot;</div>
            )}

            {Object.entries(grouped).map(([type, items]) => {
              const config = typeConfig[type as SearchResultType]
              const Icon = config.icon
              return (
                <div key={type} className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {config.label}
                  </div>
                  {items.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelect(result)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{result.title}</div>
                        {result.subtitle && (
                          <div className="truncate text-xs text-slate-500">{result.subtitle}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
