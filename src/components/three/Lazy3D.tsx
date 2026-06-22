import { lazy, Suspense, type ComponentType } from 'react'
import { cn } from '@/lib/cn'

const Globe = lazy(() => import('./Globe'))
const ParticleField = lazy(() => import('./ParticleField'))
const InfinityRibbon = lazy(() => import('./InfinityRibbon'))

function Fallback({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse-glow', className)}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 50%, rgba(225,29,46,0.12), transparent 60%)',
      }}
    />
  )
}

function wrap(Comp: ComponentType<{ className?: string }>) {
  return function Wrapped({ className }: { className?: string }) {
    return (
      <Suspense fallback={<Fallback className={className} />}>
        <Comp className={className} />
      </Suspense>
    )
  }
}

/** Lazy-loaded 3D set-pieces — keep Three.js out of the initial bundle. */
export const LazyGlobe = wrap(Globe)
export const LazyParticleField = wrap(ParticleField)
export const LazyInfinityRibbon = wrap(InfinityRibbon)
