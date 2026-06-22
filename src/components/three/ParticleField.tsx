import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/lib/hooks'

function Points({ count = 1400 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 18
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.03
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#e11d2e"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/** Subtle drifting red particle field for dark section backgrounds. */
export default function ParticleField({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <div
        className={className}
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 40%, rgba(225,29,46,0.10), transparent 60%)',
        }}
      />
    )
  }
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 9], fov: 60 }} dpr={[1, 1.6]} gl={{ antialias: true }}>
        <Points />
      </Canvas>
    </div>
  )
}
