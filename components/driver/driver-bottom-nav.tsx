'use client'

import { ClipboardList, FileStack, House } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/driver', label: 'Home', icon: House },
  { href: '/driver/trips', label: 'Trips', icon: ClipboardList },
  { href: '/driver/documents', label: 'Docs', icon: FileStack },
]

export function DriverBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previewDriver = searchParams?.get('driver')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-[rgba(255,255,255,0.96)] px-3 py-3 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const href = previewDriver ? `${item.href}?driver=${previewDriver}` : item.href

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-colors',
                isActive ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
