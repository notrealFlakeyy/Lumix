'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.dataset.visible = 'true'
          observer.unobserve(node)
        }
      },
      {
        threshold: 0.18,
      },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-visible="false"
      style={{ transitionDelay: `${delay}ms` }}
      className={cn('lumix-reveal', className)}
    >
      {children}
    </div>
  )
}
