import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  lift?: boolean
  glow?: boolean
}

export function Card({ className, lift, glow, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'glass-panel p-6',
        lift && 'card-lift',
        glow && 'red-glow',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-display text-lg font-semibold text-white', className)} {...props} />
  )
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-relaxed text-gray-400', className)} {...props} />
}
