import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Logo } from '@/components/Logo'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative">
        <Logo withWordmark={false} size={48} />
        <h1 className="mt-6 font-display text-7xl font-bold text-gradient-red">404</h1>
        <p className="mt-3 text-lg font-semibold text-white">Page not found</p>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="mt-7 inline-block">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  )
}
