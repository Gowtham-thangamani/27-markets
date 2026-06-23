import { useEffect, useState } from 'react'
import { useReducedMotion } from './hooks'

export interface Quality {
  /** When false, render the static fallback instead of a WebGL canvas. */
  enable3D: boolean
  /** Whether to mount the (expensive) bloom post-processing pass. */
  bloom: boolean
  /** Device-pixel-ratio clamp passed to <Canvas dpr>. */
  dpr: [number, number]
  /** Multiplier on particle/arc counts (0–1). */
  detail: number
  /** True for the lower-power tier (mobile / few cores). */
  lowPower: boolean
}

const HIGH: Quality = { enable3D: true, bloom: true, dpr: [1, 2], detail: 1, lowPower: false }
const LOW: Quality = { enable3D: true, bloom: false, dpr: [1, 1.5], detail: 0.5, lowPower: true }
const OFF: Quality = { enable3D: false, bloom: false, dpr: [1, 1], detail: 0, lowPower: false }

/**
 * Picks a rendering tier for 3D scenes based on the device.
 * - prefers-reduced-motion  → no 3D at all (static fallback).
 * - mobile / low-core / low-memory → lighter 3D (no bloom, lower dpr, fewer points).
 * - otherwise → full quality with bloom.
 */
export function useQuality(): Quality {
  const reduced = useReducedMotion()
  const [lowPower, setLowPower] = useState<boolean | null>(null)

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const small = window.matchMedia('(max-width: 820px)').matches
    const cores = navigator.hardwareConcurrency ?? 8
    // deviceMemory is non-standard; default high when unknown.
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    setLowPower((coarse && small) || cores <= 4 || mem <= 4)
  }, [])

  if (reduced) return OFF
  // Until detection resolves, assume low to avoid a heavy first paint on mobile.
  if (lowPower === null) return LOW
  return lowPower ? LOW : HIGH
}
