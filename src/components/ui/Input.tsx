import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, className, id, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'h-11 w-full rounded-xl border bg-ink-800/80 px-4 text-sm text-white placeholder:text-gray-500 transition-colors',
            'focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            icon && 'pl-10',
            error ? 'border-danger/60' : 'border-white/10 hover:border-white/20',
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
