import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, RoundedBox } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { makeLaptopScreenTexture, makePhoneScreenTexture } from './screenTextures'

const RED = '#e11d2e'

/** Dark brushed-metal body shared by the devices. */
function bodyMaterial() {
  return <meshStandardMaterial color="#15151a" metalness={0.85} roughness={0.34} />
}

function Laptop() {
  const screenTex = useMemo(makeLaptopScreenTexture, [])
  return (
    <group rotation={[0, 0.5, 0]} position={[-0.35, -0.35, 0]}>
      {/* Base / keyboard deck */}
      <RoundedBox args={[2.5, 0.09, 1.7]} radius={0.04} smoothness={4} position={[0, -0.05, 0.55]}>
        {bodyMaterial()}
      </RoundedBox>
      <mesh position={[0, 0.001, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 1.5]} />
        <meshStandardMaterial color="#0c0c0f" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.002, 0.95]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, 0.45]} />
        <meshStandardMaterial color="#101014" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Hinged screen */}
      <group position={[0, 0, -0.28]} rotation={[-0.32, 0, 0]}>
        <RoundedBox args={[2.5, 1.6, 0.06]} radius={0.05} smoothness={4} position={[0, 0.78, 0]}>
          {bodyMaterial()}
        </RoundedBox>
        <mesh position={[0, 0.78, 0.04]}>
          <planeGeometry args={[2.32, 1.44]} />
          <meshStandardMaterial
            map={screenTex}
            emissiveMap={screenTex}
            emissive="#ffffff"
            emissiveIntensity={1.05}
            toneMapped={false}
            roughness={0.36}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  )
}

function Phone() {
  const screenTex = useMemo(makePhoneScreenTexture, [])
  return (
    <group position={[1.12, -0.45, 0.9]} rotation={[0.05, -0.45, 0.04]}>
      <RoundedBox args={[0.78, 1.6, 0.08]} radius={0.1} smoothness={5}>
        {bodyMaterial()}
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.68, 1.48]} />
        <meshStandardMaterial
          map={screenTex}
          emissiveMap={screenTex}
          emissive="#ffffff"
          emissiveIntensity={1.1}
          toneMapped={false}
          roughness={0.32}
          metalness={0}
        />
      </mesh>
    </group>
  )
}

/** A glowing red market waveform that sweeps under the devices. */
function MarketWave3D() {
  const pulse = useRef<THREE.Mesh>(null)
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 60; i++) {
      const x = (i / 60) * 6 - 3
      const y = Math.sin(i * 0.35) * 0.28 + Math.sin(i * 0.12) * 0.18
      pts.push(new THREE.Vector3(x, y - 1.35, -0.4))
    }
    return new THREE.CatmullRomCurve3(pts)
  }, [])
  const geom = useMemo(() => new THREE.TubeGeometry(curve, 180, 0.035, 12, false), [curve])

  useFrame((state) => {
    if (!pulse.current) return
    const t = (state.clock.elapsedTime * 0.18) % 1
    pulse.current.position.copy(curve.getPointAt(t))
  })

  return (
    <group>
      <mesh geometry={geom}>
        <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh ref={pulse}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#ffd0d4" emissive="#ffffff" emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Particles({ count = 600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12
      arr[i * 3 + 1] = (Math.random() - 0.5) * 7
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1
    }
    return arr
  }, [count])

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color={RED} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/** Group that subtly follows the pointer for parallax. */
function ParallaxRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const { pointer } = useThree()
  useFrame(() => {
    if (!group.current) return
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * 0.25, 0.06)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * 0.16, 0.06)
  })
  return <group ref={group}>{children}</group>
}

export default function HeroScene({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas camera={{ position: [0, 0.35, 7], fov: 36 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <ambientLight intensity={0.45} />
        <spotLight position={[4, 6, 5]} angle={0.5} penumbra={0.8} intensity={120} color="#ff6b78" />
        <pointLight position={[-5, -2, 3]} intensity={30} color={RED} />
        <pointLight position={[0, 2, 4]} intensity={20} color="#ffffff" />

        <ParallaxRig>
          <Float speed={1.3} rotationIntensity={0.18} floatIntensity={0.5}>
            <Laptop />
          </Float>
          <Float speed={1.8} rotationIntensity={0.22} floatIntensity={0.55}>
            <Phone />
          </Float>
          <MarketWave3D />
          <Particles />
        </ParallaxRig>

        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
