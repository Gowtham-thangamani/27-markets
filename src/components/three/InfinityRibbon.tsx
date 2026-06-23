import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useQuality } from '@/lib/quality'

class Lemniscate extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super()
  }
  getPoint(t: number) {
    const a = 2.4
    const ang = t * Math.PI * 2
    const denom = 1 + Math.sin(ang) * Math.sin(ang)
    const x = (a * Math.cos(ang)) / denom
    const y = (a * Math.sin(ang) * Math.cos(ang)) / denom
    return new THREE.Vector3(x, y, Math.sin(ang * 2) * 0.25)
  }
}

function Ribbon() {
  const group = useRef<THREE.Group>(null)
  const pulses = useRef<(THREE.Mesh | null)[]>([])

  const curve = useMemo(() => new Lemniscate(), [])
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 240, 0.06, 18, true), [curve])

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.z += delta * 0.12
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.18
    }
    const t = state.clock.elapsedTime
    // Two pulses chasing each other around the loop.
    pulses.current.forEach((m, i) => {
      if (m) m.position.copy(curve.getPointAt((t * 0.16 + i * 0.5) % 1))
    })
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#ff2436" emissive="#e11d2e" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh geometry={geometry} scale={1.05}>
        <meshBasicMaterial color="#e11d2e" transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => (pulses.current[i] = el)}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#ffe3e6" emissive="#ffffff" emissiveIntensity={3.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Glowing red infinity-loop light ribbon with travelling energy pulses. */
export default function InfinityRibbon({ className }: { className?: string }) {
  const quality = useQuality()
  if (!quality.enable3D) {
    return (
      <div className={className} aria-hidden>
        <svg viewBox="0 0 200 100" className="h-full w-full">
          <path
            d="M40 50c0-14 10-24 22-24s20 10 38 24 26 24 38 24 22-10 22-24-10-24-22-24-26 10-38 24-26 24-38 24-22-10-22-24z"
            fill="none"
            stroke="#e11d2e"
            strokeWidth="3"
            opacity="0.8"
            style={{ filter: 'drop-shadow(0 0 8px rgba(225,29,46,0.7))' }}
          />
        </svg>
      </div>
    )
  }
  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={quality.dpr}>
        <ambientLight intensity={0.6} />
        <Ribbon />
        {quality.bloom && (
          <EffectComposer>
            <Bloom intensity={1.3} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
