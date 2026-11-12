import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { getPath } from './path'
import { characterPos, characterSpeed } from './shared'

const SUIT = '#2e3a44'
const SHIRT = '#f7f9fa'
const SKIN = '#e8b98a'
const BRAND = '#408fb4'
const HAIR = '#1c2126'

/** limb pivoting from its top (hip/shoulder) */
function Limb({
  innerRef,
  color,
  size,
  position,
}: {
  innerRef?: React.RefObject<THREE.Group | null>
  color: string
  size: [number, number, number]
  position: [number, number, number]
}) {
  return (
    <group ref={innerRef} position={position}>
      <mesh position={[0, -size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  )
}

export function Character() {
  const group = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)

  const smoothed = useRef(0)
  const curve = useMemo(() => getPath(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    const { target, tick } = useJourney.getState()
    const dt = Math.min(delta, 0.05)
    const prev = smoothed.current
    smoothed.current = THREE.MathUtils.damp(smoothed.current, clamp01(target), 4.5, dt)
    const speed = Math.abs(smoothed.current - prev) / Math.max(dt, 1e-4)
    characterSpeed.current = THREE.MathUtils.clamp(speed / 14, 0, 1)

    const t = clamp01(smoothed.current)
    curve.getPointAt(t, tmp)
    curve.getTangentAt(t, tan)
    characterPos.current.copy(tmp)
    tick(t)

    const g = group.current
    if (!g) return
    g.position.set(tmp.x, 0, tmp.z)
    g.rotation.y = Math.atan2(tan.x, tan.z)

    const moving = characterSpeed.current
    const time = state.clock.elapsedTime
    const stride = time * 11
    const swing = Math.sin(stride) * 0.55 * moving
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armR.current) armR.current.rotation.x = -swing * 0.8
    if (armL.current) armL.current.rotation.x = Math.sin(time * 1.8) * 0.04
    if (body.current) body.current.position.y = Math.abs(Math.sin(stride)) * 0.08 * moving
  })

  return (
    <group ref={group}>
      <group ref={body}>
        {/* legs */}
        <Limb innerRef={legL} color={SUIT} size={[0.16, 0.5, 0.16]} position={[-0.12, 0.5, 0]} />
        <Limb innerRef={legR} color={SUIT} size={[0.16, 0.5, 0.16]} position={[0.12, 0.5, 0]} />
        {/* torso: suit + shirt + tie */}
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[0.44, 0.62, 0.26]} />
          <meshStandardMaterial color={SUIT} flatShading />
        </mesh>
        <mesh position={[0, 0.82, 0.135]}>
          <boxGeometry args={[0.18, 0.5, 0.02]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>
        <mesh position={[0, 0.85, 0.15]}>
          <boxGeometry args={[0.07, 0.34, 0.02]} />
          <meshStandardMaterial color={BRAND} flatShading />
        </mesh>
        {/* head + hair */}
        <mesh position={[0, 1.32, 0]}>
          <sphereGeometry args={[0.17, 12, 10]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        <mesh position={[0, 1.42, -0.02]}>
          <boxGeometry args={[0.24, 0.12, 0.22]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        {/* arms — left one carries the laptop */}
        <Limb innerRef={armL} color={SUIT} size={[0.12, 0.46, 0.12]} position={[-0.29, 1.06, 0]} />
        <Limb innerRef={armR} color={SUIT} size={[0.12, 0.46, 0.12]} position={[0.29, 1.06, 0]} />
        <mesh position={[-0.36, 0.72, 0.08]} rotation={[0.2, 0, 0.15]}>
          <boxGeometry args={[0.3, 0.22, 0.03]} />
          <meshStandardMaterial color={BRAND} flatShading />
        </mesh>
      </group>
    </group>
  )
}
