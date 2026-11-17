import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cameraColliders } from '../three/shared'
import { ARENA_ORIGIN, arenaRefs } from './layout'
import {
  ARENA_HALF,
  BLOCK_COLORS,
  BLOCK_KINDS,
  cellKey,
  useGame,
  type BlockKind,
  type Cell,
} from './store'

const BLOCK_SIZE = 0.96

/**
 * The build area is part of the journey world, not a separate room: these
 * blocks sit on the same ground the character walks on and stay visible when
 * Play mode is closed.
 */
export function Arena() {
  const blocks = useGame((s) => s.blocks)
  const progress = useGame((s) => s.progress)
  const column = useGame((s) => s.column)
  const group = useRef<THREE.Group>(null)
  const floor = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE), [])
  const materials = useMemo(() => {
    const map = {} as Record<BlockKind, THREE.MeshStandardMaterial>
    for (const kind of BLOCK_KINDS) {
      map[kind] = new THREE.MeshStandardMaterial({
        color: BLOCK_COLORS[kind],
        roughness: 0.62,
        metalness: 0.04,
      })
    }
    return map
  }, [])

  useEffect(() => {
    arenaRefs.blocks = group.current
    arenaRefs.floor = floor.current
    if (group.current) cameraColliders.push(group.current)
    return () => {
      arenaRefs.blocks = null
      arenaRefs.floor = null
      const i = cameraColliders.indexOf(group.current!)
      if (i >= 0) cameraColliders.splice(i, 1)
    }
  }, [])

  return (
    <group position={[ARENA_ORIGIN.x, 0, ARENA_ORIGIN.z]}>
      <group ref={group}>
        {blocks.map((b) => (
          <mesh
            key={cellKey(b)}
            geometry={geometry}
            material={materials[b.kind]}
            position={[b.x + 0.5, b.y + 0.5, b.z + 0.5]}
            userData={{ cell: b }}
          />
        ))}
      </group>
      {/* outside the raycast group: light is not a block */}
      {progress === 5 && column && <MeaningBeacon column={column} />}
      {/* invisible hit plane: clicks on empty ground still need a surface */}
      <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} visible={false}>
        <planeGeometry args={[ARENA_HALF * 2 + 2, ARENA_HALF * 2 + 2]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}

const MOTES = 42

/** a completed meaningful stack becomes a landmark: cap, beacon and rising motes */
function MeaningBeacon({ column }: { column: Cell[] }) {
  const x = column[0].x + 0.5
  const z = column[0].z + 0.5
  const top = column[column.length - 1].y + 1
  const cap = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)
  const points = useRef<THREE.Points>(null)

  const { geometry, speeds } = useMemo(() => {
    const positions = new Float32Array(MOTES * 3)
    const speeds = new Float32Array(MOTES)
    for (let i = 0; i < MOTES; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.25 + Math.random() * 0.55
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = Math.random() * (top + 5)
      positions[i * 3 + 2] = Math.sin(a) * r
      speeds[i] = 0.5 + Math.random() * 0.9
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, speeds }
  }, [top])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.05)
    if (cap.current) {
      const m = cap.current.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 1.1 + Math.sin(t * 2.4) * 0.45
    }
    if (beam.current) {
      const m = beam.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.2 + Math.sin(t * 1.6) * 0.07
    }
    if (points.current) {
      const attr = points.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < MOTES; i++) {
        arr[i * 3 + 1] += speeds[i] * dt
        if (arr[i * 3 + 1] > top + 5) arr[i * 3 + 1] = 0.15
      }
      attr.needsUpdate = true
    }
  })

  return (
    <group position={[x, 0, z]}>
      <mesh ref={cap} position={[0, top + 0.07, 0]}>
        <boxGeometry args={[0.72, 0.14, 0.72]} />
        <meshStandardMaterial
          color="#f2b23c"
          emissive="#f2b23c"
          emissiveIntensity={1.2}
          roughness={0.4}
        />
      </mesh>
      <mesh ref={beam} position={[0, top + 7, 0]}>
        <cylinderGeometry args={[0.16, 0.4, 14, 12, 1, true]} />
        <meshBasicMaterial
          color="#ffd98a"
          transparent
          opacity={0.24}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.72, 0.98, 40]} />
        <meshBasicMaterial
          color="#f2b23c"
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={points} geometry={geometry}>
        <pointsMaterial
          color="#ffd98a"
          size={0.09}
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
