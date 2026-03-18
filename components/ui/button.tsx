import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(95,73,52,0.12)] hover:-translate-y-[1px] hover:brightness-[0.99] active:translate-y-0 active:brightness-[0.96]',
        secondary:
          'bg-[rgb(var(--app-accent-2))] text-[rgb(var(--app-contrast))] shadow-[0_10px_24px_rgba(95,73,52,0.08)] hover:brightness-[0.98] active:brightness-[0.95]',
        outline: 'border border-border/35 bg-background/80 text-foreground hover:bg-primary/10 active:bg-primary/15 backdrop-blur',
        ghost: 'bg-transparent text-foreground hover:bg-primary/10 active:bg-primary/15',
        destructive: 'bg-destructive text-destructive-foreground shadow-[0_12px_28px_rgba(95,73,52,0.12)] hover:bg-destructive/90 active:bg-destructive/85',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-10 px-4 rounded-xl',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11 rounded-2xl',
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
