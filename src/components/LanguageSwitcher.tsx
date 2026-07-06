import { Globe } from 'lucide-react'
import { useLang } from '@/i18n/LanguageContext'
import { cn } from '@/lib/cn'

/** Compact EN ⇄ AR toggle. Sets document dir/lang via the language context. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, toggle } = useLang()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === 'ar' ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic (العربية)'}
      title={lang === 'ar' ? 'English' : 'العربية'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white',
        className,
      )}
    >
      <Globe className="h-4 w-4" />
      <span className="font-semibold uppercase">{lang === 'ar' ? 'EN' : 'ع'}</span>
    </button>
  )
}
