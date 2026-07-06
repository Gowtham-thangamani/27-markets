import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

/**
 * Sticky conversion bar for small screens — keeps the two primary actions
 * within thumb reach on every public page. Hidden on lg+ (nav CTA covers it).
 */
export function MobileCTABar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-ink-900/90 p-3 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex max-w-md gap-2.5">
        <Link to="/register" className="flex-1">
          <Button size="md" className="w-full">
            Open Account
          </Button>
        </Link>
        <Link to="/demo" className="flex-1">
          <Button variant="outline" size="md" className="w-full">
            Try Demo
          </Button>
        </Link>
      </div>
    </div>
  )
}
