import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Logo'
import { useT } from '@/i18n/LanguageContext'

export default function NotFoundPage() {
  const t = useT()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative">
        <Logo withWordmark={false} size={48} />
        <h1 className="mt-6 font-display text-7xl font-bold text-gradient-red">404</h1>
        <p className="mt-3 text-lg font-semibold text-white">{t('nf.title')}</p>
        <p className="mt-1 max-w-sm text-sm text-gray-400">{t('nf.desc')}</p>
        <Link to="/" className="mt-7 inline-block">
          <Button>{t('nf.back')}</Button>
        </Link>
      </div>
    </div>
  )
}
