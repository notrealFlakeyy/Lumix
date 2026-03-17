'use client'

import { Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'

export function TableSearch({ placeholder = 'Search...' }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams?.get('q') ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValue(searchParams?.get('q') ?? '')
  }, [searchParams])

  const handleChange = useCallback(
    (term: string) => {
      setValue(term)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams?.toString() ?? '')
        if (term) {
          params.set('q', term)
        } else {
          params.delete('q')
        }
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`)
      }, 300)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} className="h-10 w-64 pl-9" />
    </div>
  )
}
