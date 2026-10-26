import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

const variants = cva(
  'inline-flex items-center justify-center gap-2 rounded-btn font-bold transition active:scale-[.97] disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-pink-strong text-white shadow-card',
        soft: 'bg-pink-soft text-pink-text',
        sun: 'bg-sun text-sun-text',
        leaf: 'bg-leaf-soft text-leaf-text',
        ghost: 'text-ink2 hover:bg-white',
      },
      size: { md: 'h-12 px-5', lg: 'h-14 px-6 text-[16px]', icon: 'h-11 w-11' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, ...p }, ref) => {
  const C = asChild ? Slot : 'button'
  return <C ref={ref} className={cn(variants({ variant, size }), className)} {...p} />
})
Button.displayName = 'Button'
