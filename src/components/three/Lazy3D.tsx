import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react'

const Globe = lazy(() => import('./Globe'))
const ParticleField = lazy(() => import('./ParticleField'))
const InfinityRibbon = lazy(() => import('./InfinityRibbon'))
const HeroScene = lazy(() => import('./HeroScene'))

function Fallback({ className }: { className?: string }) {
  // Reuses the same gradient as the reduced-motion/static fallbacks.
  return <div className={`globe-fallback animate-pulse-glow ${className ?? ''}`} aria-hidden />
}

/**
 * Catches runtime failures from the 3D scene (e.g. WebGL context creation
 * failing on a locked-down or very old browser) and shows the static fallback
 * instead of crashing the whole section.
 */
class WebGLBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function wrap(Comp: ComponentType<{ className?: string }>) {
  return function Wrapped({ className }: { className?: string }) {
    return (
      <WebGLBoundary fallback={<Fallback className={className} />}>
        <Suspense fallback={<Fallback className={className} />}>
          <Comp className={className} />
        </Suspense>
      </WebGLBoundary>
    )
  }
}

/** Lazy-loaded 3D set-pieces — keep Three.js out of the initial bundle. */
export const LazyGlobe = wrap(Globe)
export const LazyParticleField = wrap(ParticleField)
export const LazyInfinityRibbon = wrap(InfinityRibbon)
export const LazyHeroScene = wrap(HeroScene)
