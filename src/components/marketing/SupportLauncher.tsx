import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'

/**
 * Floating support launcher, present on every public page. Currently routes to
 * the contact page; swap the `to` for a live-chat provider embed when available.
 * Sits above the mobile CTA bar on small screens so the two never overlap.
 */
export function SupportLauncher() {
  return (
    <Link
      to="/contact"
      aria-label="Contact support"
      className="group fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-500 py-3 pl-3 pr-4 text-sm font-semibold text-white shadow-[0_10px_30px_-6px_rgba(225,29,46,0.6)] transition-all hover:-translate-y-0.5 hover:bg-brand-600 lg:bottom-6"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Chat with us</span>
    </Link>
  )
}
