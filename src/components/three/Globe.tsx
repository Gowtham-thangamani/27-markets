import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/lib/hooks'

function GlobeMesh() {
  const group = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.18
  })

  // Dotted point cloud on a sphere surface (world-map feel).
  const dots = useMemo(() => {
    const count = 1600
    const arr = new Float32Array(count * 3)
    const r = 2
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [])

  // Connection arcs between random surface points.
  const arcs = useMemo(() => {
    const lines: THREE.Vector3[][] = []
    const rand = () => {
      const phi = Math.acos(2 * Math.random() - 1)
      const theta = 2 * Math.PI * Math.random()
      return new THREE.Vector3(
        2 * Math.sin(phi) * Math.cos(theta),
        2 * Math.cos(phi),
        2 * Math.sin(phi) * Math.sin(theta)
      )
    }
    for (let i = 0; i < 12; i++) {
      const a = rand()
      const b = rand()
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(2.9)
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      lines.push(curve.getPoints(40))
    }
    return lines
  }, [])

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={dots.length / 3}
            array={dots}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.028} color="#ff4d5e" transparent opacity={0.85} sizeAttenuation />
      </points>

      <mesh>
        <sphereGeometry args={[1.97, 48, 48]} />
        <meshBasicMaterial color="#1a0608" transparent opacity={0.55} />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.02, 32, 32]} />
        <meshBasicMaterial color="#e11d2e" wireframe transparent opacity={0.06} />
      </mesh>

      {arcs.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pts.length}
              array={new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ff5663" transparent opacity={0.5} />
        </line>
      ))}
    </group>
  )
}

/** Rotating dotted red globe with connection arcs. */
export default function Globe({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) {
    return (
      <div
        className={className}
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(225,29,46,0.18), transparent 62%)',
        }}
      />
    )
  }
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.6]}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 3, 5]} intensity={40} color="#e11d2e" />
        <GlobeMesh />
      </Canvas>
    </div>
  )
}
