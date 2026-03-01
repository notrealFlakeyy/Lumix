import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'border-border/25 bg-background text-foreground',
      success: 'border-primary/35 bg-primary/20 text-foreground',
      warning: 'border-[rgb(var(--app-accent-2))]/45 bg-[rgb(var(--app-accent-2))]/35 text-foreground',
      destructive: 'border-secondary/25 bg-secondary/10 text-secondary',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
