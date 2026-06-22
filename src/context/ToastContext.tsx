import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, X, AlertTriangle, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
}

const accents: Record<ToastKind, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-sky-400',
  warning: 'text-warning',
}

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++counter
      setToasts((prev) => [...prev, { ...t, id }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove]
  )

  const helpers: ToastContextValue = {
    toast,
    success: (title, description) => toast({ kind: 'success', title, description }),
    error: (title, description) => toast({ kind: 'error', title, description }),
    info: (title, description) => toast({ kind: 'info', title, description }),
    warning: (title, description) => toast({ kind: 'warning', title, description }),
  }

  return (
    <ToastContext.Provider value={helpers}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.kind]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="glass-panel pointer-events-auto flex items-start gap-3 p-4 shadow-panel"
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', accents[t.kind])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs text-gray-400">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Dismiss"
                  className="rounded-md p-1 text-gray-500 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
