import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-onaccent hover:bg-brand-600 shadow-[0_8px_30px_-8px_rgba(225,29,46,0.6)] hover:shadow-[0_10px_40px_-6px_rgba(225,29,46,0.7)]',
  secondary: 'bg-ink-400 text-white hover:bg-ink-300 border border-white/[0.06]',
  outline:
    'border border-white/15 text-white hover:border-brand-500/60 hover:bg-brand-500/[0.08]',
  ghost: 'text-gray-300 hover:text-white hover:bg-white/[0.05]',
  danger: 'bg-danger text-onaccent hover:bg-danger/90',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-[52px] px-8 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
