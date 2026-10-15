import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { dialCodes, DEFAULT_DIAL_CODE } from '@/lib/dialCodes'
import { cn } from '@/lib/cn'

export interface PhoneInputProps {
  label?: string
  error?: string
  /** Full E.164-ish value, e.g. "+971501234567". */
  value: string
  onChange: (value: string) => void
}

/** Longest matching dial code for a full phone value (so +1 doesn't shadow +971 by re-testing 1-char prefixes). */
function splitPhone(value: string): { dial: string; local: string } {
  const sorted = [...dialCodes].sort((a, b) => b.dial.length - a.dial.length)
  const match = sorted.find((c) => value.startsWith(c.dial))
  if (match) return { dial: match.dial, local: value.slice(match.dial.length) }
  return { dial: DEFAULT_DIAL_CODE, local: value.replace(/^\+/, '') }
}

/** Country-code select + local-number input, composed into one E.164-ish value for the form. */
export function PhoneInput({ label, error, value, onChange }: PhoneInputProps) {
  const [dial, setDial] = useState(() => splitPhone(value).dial)
  const [local, setLocal] = useState(() => splitPhone(value).local)

  // Stay in sync if the parent resets the form (e.g. after submit) without
  // fighting the user's typing on every keystroke.
  useEffect(() => {
    if (value === '') {
      setDial(DEFAULT_DIAL_CODE)
      setLocal('')
    }
  }, [value])

  const emit = (nextDial: string, nextLocal: string) => {
    const digits = nextLocal.replace(/[^\d]/g, '')
    onChange(digits ? `${nextDial}${digits}` : '')
  }

  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>}
      <div className="flex gap-2">
        <div className="relative w-32 shrink-0">
          <select
            aria-label="Country code"
            value={dial}
            onChange={(e) => { setDial(e.target.value); emit(e.target.value, local) }}
            className={cn(
              'h-11 w-full appearance-none rounded-xl border bg-ink-800/80 pl-3 pr-8 text-sm text-white transition-colors',
              'focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
              error ? 'border-danger/60' : 'border-white/10 hover:border-white/20'
            )}
          >
            {dialCodes.map((c) => (
              <option key={c.iso2} value={c.dial} className="bg-ink-700">
                {c.iso2} {c.dial}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          aria-label="Mobile number"
          placeholder="50 123 4567"
          value={local}
          onChange={(e) => { setLocal(e.target.value); emit(dial, e.target.value) }}
          aria-invalid={!!error}
          className={cn(
            'h-11 w-full min-w-0 flex-1 rounded-xl border bg-ink-800/80 px-4 text-sm text-white placeholder:text-gray-500 transition-colors',
            'focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            error ? 'border-danger/60' : 'border-white/10 hover:border-white/20'
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}
