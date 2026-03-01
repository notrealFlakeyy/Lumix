import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--btn-from))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--app-bg))] disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-btn-gradient text-app shadow-softSm hover:opacity-95 hover:shadow-soft active:opacity-95',
        secondary: 'bg-secondary text-secondary-foreground shadow-softSm hover:opacity-95 hover:shadow-soft active:opacity-95',
        outline: 'border border-border bg-transparent text-foreground hover:bg-card/20 active:bg-card/25',
        ghost: 'bg-transparent text-foreground hover:bg-card/20 active:bg-card/25',
        destructive: 'bg-destructive text-destructive-foreground shadow-softSm hover:opacity-95 hover:shadow-soft active:opacity-95',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-10 px-4',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
