import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/lib/hooks'

function Ribbon() {
  const ref = useRef<THREE.Mesh>(null)

  // Lemniscate (infinity) curve extruded as a glowing tube.
  const geometry = useMemo(() => {
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
    return new THREE.TubeGeometry(new Lemniscate(), 220, 0.07, 16, true)
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.z += delta * 0.15
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    const mat = ref.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.75 + Math.sin(state.clock.elapsedTime * 2) * 0.2
  })

  return (
    <>
      <mesh ref={ref} geometry={geometry}>
        <meshBasicMaterial color="#ff2436" transparent opacity={0.9} />
      </mesh>
      <mesh geometry={geometry} scale={1.03}>
        <meshBasicMaterial color="#e11d2e" transparent opacity={0.18} />
      </mesh>
    </>
  )
}

/** Glowing red infinity-loop light ribbon for the partnership area. */
export default function InfinityRibbon({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <div className={className}>
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
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.6]}>
        <Ribbon />
      </Canvas>
    </div>
  )
}
