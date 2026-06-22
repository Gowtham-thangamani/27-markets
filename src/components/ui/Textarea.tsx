import { forwardRef, type TextareaHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'min-h-[120px] w-full resize-y rounded-xl border bg-ink-800/80 px-4 py-3 text-sm text-white placeholder:text-gray-500 transition-colors',
          'focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          error ? 'border-danger/60' : 'border-white/10 hover:border-white/20',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
})
