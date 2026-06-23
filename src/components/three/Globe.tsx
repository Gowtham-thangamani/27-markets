import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useQuality } from '@/lib/quality'

const R = 2

function randomSurfacePoint(): THREE.Vector3 {
  const phi = Math.acos(2 * Math.random() - 1)
  const theta = 2 * Math.PI * Math.random()
  return new THREE.Vector3(
    R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta),
  )
}

function GlobeMesh({ detail }: { detail: number }) {
  const group = useRef<THREE.Group>(null)
  const pulses = useRef<(THREE.Mesh | null)[]>([])
  const ARC_COUNT = Math.max(7, Math.round(14 * detail))

  // Even point distribution on the sphere (fibonacci) — reads as a dotted globe.
  const dots = useMemo(() => {
    const count = Math.round(2600 * detail)
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      arr[i * 3] = R * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = R * Math.cos(phi)
      arr[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [detail])

  // Connection arcs as thin emissive tubes (so bloom catches them).
  const arcs = useMemo(() => {
    return Array.from({ length: ARC_COUNT }, () => {
      const a = randomSurfacePoint()
      const b = randomSurfacePoint()
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.5)
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      return {
        curve,
        geom: new THREE.TubeGeometry(curve, 50, 0.01, 8, false),
        offset: Math.random(),
        speed: 0.12 + Math.random() * 0.12,
      }
    })
  }, [ARC_COUNT])

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.16
    const t = state.clock.elapsedTime
    arcs.forEach((arc, i) => {
      const m = pulses.current[i]
      if (m) m.position.copy(arc.curve.getPointAt((t * arc.speed + arc.offset) % 1))
    })
  })

  return (
    <group ref={group}>
      {/* Occluding core so back-facing dots don't show through */}
      <mesh>
        <sphereGeometry args={[R * 0.985, 48, 48]} />
        <meshStandardMaterial color="#120406" roughness={1} metalness={0} />
      </mesh>

      {/* Surface dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={dots.length / 3} array={dots} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.022} color="#ff5663" transparent opacity={0.9} sizeAttenuation />
      </points>

      {/* Atmosphere halo */}
      <mesh>
        <sphereGeometry args={[R * 1.12, 48, 48]} />
        <meshBasicMaterial color="#e11d2e" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Emissive arcs + travelling pulses */}
      {arcs.map((arc, i) => (
        <group key={i}>
          <mesh geometry={arc.geom}>
            <meshStandardMaterial color="#ff5663" emissive="#ff2436" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          <mesh ref={(el) => (pulses.current[i] = el)}>
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial color="#ffd9dc" emissive="#ffffff" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Rotating dotted red globe with a glowing atmosphere and animated arcs. */
export default function Globe({ className }: { className?: string }) {
  const quality = useQuality()
  if (!quality.enable3D) {
    return <div className={`globe-fallback ${className ?? ''}`} aria-hidden />
  }
  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={quality.dpr}>
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 3, 5]} intensity={50} color="#ff6b78" />
        <GlobeMesh detail={quality.detail} />
        {quality.bloom && (
          <EffectComposer>
            <Bloom intensity={1.1} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
