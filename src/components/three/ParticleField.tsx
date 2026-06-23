import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useQuality } from '@/lib/quality'

function Layer({
  count,
  size,
  opacity,
  spread,
  speed,
  color,
}: {
  count: number
  size: number
  opacity: number
  spread: [number, number, number]
  speed: number
  color: string
}) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread[0]
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread[2]
    }
    return arr
  }, [count, spread])

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * speed
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.06
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/** Layered drifting red particle field with parallax depth. */
export default function ParticleField({ className }: { className?: string }) {
  const quality = useQuality()
  if (!quality.enable3D) {
    return <div className={`particles-fallback ${className ?? ''}`} aria-hidden />
  }
  const d = quality.detail
  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0, 9], fov: 60 }} dpr={quality.dpr} gl={{ antialias: true }}>
        {/* Far, dim layer for depth */}
        <Layer count={Math.round(900 * d)} size={0.02} opacity={0.4} spread={[22, 12, 6]} speed={0.015} color="#ff5663" />
        {/* Near, brighter layer */}
        <Layer count={Math.round(700 * d)} size={0.04} opacity={0.8} spread={[16, 9, 7]} speed={0.035} color="#e11d2e" />
      </Canvas>
    </div>
  )
}
