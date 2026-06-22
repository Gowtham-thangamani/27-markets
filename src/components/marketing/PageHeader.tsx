import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/motion'

interface PageHeaderProps {
  breadcrumb: string[]
  title: string
  description?: string
}

const crumbHref: Record<string, string> = {
  Home: '/',
  'About Us': '/about',
  Markets: '/markets',
  Accounts: '/accounts',
  Partnership: '/partnership',
  'Contact Us': '/contact',
}

export function PageHeader({ breadcrumb, title, description }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[40rem] -translate-x-1/2 bg-radial-red opacity-60 blur-2xl" />
      <div className="container-x relative py-14 sm:py-16">
        <motion.nav
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-3 flex items-center gap-1.5 text-xs text-gray-500"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((crumb, i) => {
            const last = i === breadcrumb.length - 1
            return (
              <span key={crumb} className="flex items-center gap-1.5">
                {last ? (
                  <span className="text-brand-400">{crumb}</span>
                ) : (
                  <Link to={crumbHref[crumb] ?? '/'} className="hover:text-gray-300">
                    {crumb}
                  </Link>
                )}
                {!last && <ChevronRight className="h-3 w-3" />}
              </span>
            )
          })}
        </motion.nav>
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-3 max-w-2xl text-base leading-relaxed text-gray-400"
          >
            {description}
          </motion.p>
        )}
      </div>
    </section>
  )
}
