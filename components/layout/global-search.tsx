'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car, FileText, Loader2, Search, Truck, User, Users } from 'lucide-react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type SearchResultType = 'customer' | 'order' | 'quote' | 'invoice' | 'vehicle' | 'driver'

type SearchResult = {
  type: SearchResultType
  id: string
  title: string
  subtitle: string
  href: string
}

const typeConfig: Record<SearchResultType, { label: string; icon: typeof Search }> = {
  customer: { label: 'Customers', icon: Users },
  order: { label: 'Orders', icon: Truck },
  quote: { label: 'Quotes', icon: FileText },
  invoice: { label: 'Invoices', icon: FileText },
  vehicle: { label: 'Vehicles', icon: Car },
  driver: { label: 'Drivers', icon: User },
}

export function GlobalSearch({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
      return
    }

    setQuery('')
    setResults([])
    setLoading(false)
  }, [open])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

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
          const response = await fetch(`/api/search?q=${encodeURIComponent(value)}&locale=${encodeURIComponent(locale)}`, {
            method: 'GET',
            cache: 'no-store',
          })

          if (!response.ok) {
            setResults([])
            return
          }

          setResults((await response.json()) as SearchResult[])
        } catch {
          setResults([])
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [locale],
  )

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      router.push(result.href)
    },
    [router],
  )

  const grouped = results.reduce<Record<string, SearchResult[]>>((accumulator, result) => {
    if (!accumulator[result.type]) accumulator[result.type] = []
    accumulator[result.type].push(result)
    return accumulator
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
              onChange={(event) => handleSearch(event.target.value)}
              placeholder="Search customers, quotes, orders, invoices..."
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" /> : null}
          </div>

          <div className="max-h-[320px] overflow-y-auto px-2 py-2">
            {!query.trim() ? (
              <div className="px-3 py-8 text-center text-sm text-slate-400">Type to search across all entities</div>
            ) : null}

            {query.trim() && !loading && results.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-400">No results found for &quot;{query}&quot;</div>
            ) : null}

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
                        {result.subtitle ? (
                          <div className="truncate text-xs text-slate-500">{result.subtitle}</div>
                        ) : null}
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
