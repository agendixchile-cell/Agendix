import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-orange-500 text-white shadow-sm shadow-orange-600/20 hover:bg-orange-600 active:bg-orange-700',
        secondary:
          'border border-slate-200/90 bg-white text-slate-700 shadow-sm shadow-slate-900/[0.035] hover:border-orange-200 hover:bg-orange-50/50 hover:text-slate-900',
        ghost: 'text-slate-500 hover:bg-orange-50 hover:text-orange-700',
        danger: 'bg-red-500 text-white shadow-sm hover:bg-red-600 active:bg-red-700',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-xs',
        md: 'h-10',
        lg: 'h-11 rounded-xl px-5',
        icon: 'h-9 w-9 px-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
