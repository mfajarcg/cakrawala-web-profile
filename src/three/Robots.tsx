import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GREET_MS, GREET_RADIUS, ROBOTS, useRobots, type RobotDef } from '../game/robots'
import { useGame } from '../game/store'
import { useI18n } from '../lib/i18n'
import { characterPos } from './shared'

const damp = THREE.MathUtils.damp
const bubbleVec = new THREE.Vector3()

/** keeps the 15rem bubble inside the viewport even when the robot hugs an edge */
function bubblePosition(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) {
  bubbleVec.setFromMatrixPosition(el.matrixWorld).project(camera)
  const x = (bubbleVec.x * 0.5 + 0.5) * size.width
  const y = (-bubbleVec.y * 0.5 + 0.5) * size.height
  return [
    Math.min(Math.max(x, 128), size.width - 128),
    Math.min(Math.max(y, 48), size.height - 48),
  ]
}

function RobotUnit({ def, index }: { def: RobotDef; index: number }) {
  const { t } = useI18n()
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const visor = useRef<THREE.MeshStandardMaterial>(null)
  const greeting = useRobots((s) => s.greeting)
  const clearGreet = useRobots((s) => s.clearGreet)
  const active = greeting?.id === def.id
  const seq = greeting?.seq ?? 0

  useEffect(() => {
    if (!active) return
    const id = window.setTimeout(clearGreet, GREET_MS)
    return () => window.clearTimeout(id)
  }, [active, seq, clearGreet])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const time = state.clock.elapsedTime
    const g = root.current
    if (!g) return
    if (active) {
      const dx = characterPos.current.x - g.position.x
      const dz = characterPos.current.z - g.position.z
      g.rotation.y = damp(g.rotation.y, Math.atan2(dx, dz), 8, dt)
      g.position.y = Math.abs(Math.sin(time * 6)) * 0.1
      if (armR.current) armR.current.rotation.z = 2.3 + Math.sin(time * 9) * 0.35
      if (head.current) head.current.rotation.y = damp(head.current.rotation.y, 0, 8, dt)
      if (visor.current) visor.current.emissiveIntensity = 2.6
    } else {
      const px = def.x + Math.sin(time * 0.22 + index * 2) * 0.7
      const pz = def.z + Math.cos(time * 0.17 + index) * 0.5
      g.position.set(px, Math.sin(time * 2 + index) * 0.04, pz)
      g.rotation.y = damp(g.rotation.y, def.face + Math.sin(time * 0.3 + index) * 0.2, 3, dt)
      if (armR.current) armR.current.rotation.z = damp(armR.current.rotation.z, 0, 6, dt)
      if (head.current) head.current.rotation.y = Math.sin(time * 0.8 + index) * 0.45
      if (visor.current) visor.current.emissiveIntensity = 1.4
    }
  })

  const line = t.npc.lines[(index + seq) % t.npc.lines.length]

  return (
    <group ref={root} position={[def.x, 0, def.z]} rotation={[0, def.face, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.7, 20]} />
        <meshBasicMaterial color={def.hue} transparent opacity={0.22} toneMapped={false} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.45, 16]} />
        <meshBasicMaterial color="#0b1216" transparent opacity={0.18} />
      </mesh>
      <mesh position={[-0.14, 0.21, 0]}>
        <boxGeometry args={[0.16, 0.42, 0.2]} />
        <meshStandardMaterial color="#22303a" flatShading />
      </mesh>
      <mesh position={[0.14, 0.21, 0]}>
        <boxGeometry args={[0.16, 0.42, 0.2]} />
        <meshStandardMaterial color="#22303a" flatShading />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.52, 0.62, 0.36]} />
        <meshStandardMaterial color="#e8eef2" flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0.19]}>
        <boxGeometry args={[0.18, 0.18, 0.05]} />
        <meshBasicMaterial color={def.hue} toneMapped={false} />
      </mesh>
      <group ref={head} position={[0, 1.28, 0]}>
        <mesh>
          <boxGeometry args={[0.44, 0.36, 0.4]} />
          <meshStandardMaterial color="#dfe8ec" flatShading />
        </mesh>
        <mesh position={[0, 0.02, 0.21]}>
          <boxGeometry args={[0.34, 0.12, 0.04]} />
          <meshStandardMaterial
            ref={visor}
            color="#101418"
            emissive={def.hue}
            emissiveIntensity={1.4}
            flatShading
          />
        </mesh>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.22, 4]} />
          <meshStandardMaterial color="#22303a" flatShading />
        </mesh>
        <mesh position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={def.hue} toneMapped={false} />
        </mesh>
      </group>
      <group position={[-0.32, 1.02, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.14]} />
          <meshStandardMaterial color="#22303a" flatShading />
        </mesh>
      </group>
      <group ref={armR} position={[0.32, 1.02, 0]}>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.12, 0.5, 0.14]} />
          <meshStandardMaterial color="#22303a" flatShading />
        </mesh>
      </group>
      {active && (
        <Html
          position={[0, 2.15, 0]}
          center
          zIndexRange={[30, 0]}
          className="pointer-events-none"
          calculatePosition={bubblePosition}
        >
          <div
            data-robot-bubble
            className="pointer-events-none w-[15rem] rounded-xl border border-white/15 bg-[#101418]/92 px-3 py-2 text-center shadow-[0_0.75rem_2rem_rgba(0,0,0,0.45)] backdrop-blur"
          >
            <p
              className="text-[0.6rem] font-black uppercase tracking-[0.24em]"
              style={{ color: def.hue }}
            >
              {def.name}
            </p>
            <p className="mt-1 text-[0.72rem] font-semibold leading-snug text-white/90">{line}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

/** proximity probe: only free adventure greets, and only while actually playing */
function GreetProbe() {
  const acc = useRef(0)
  useFrame((_, delta) => {
    acc.current += delta
    if (acc.current < 0.12) return
    acc.current = 0
    const st = useGame.getState()
    const active =
      st.mode === 'game' && st.adventure && !st.paused && st.gate === 'none' && !st.result
    if (!active) {
      useRobots.getState().setNear(null)
      return
    }
    let best: string | null = null
    let bestD = GREET_RADIUS
    for (const r of ROBOTS) {
      const d = Math.hypot(characterPos.current.x - r.x, characterPos.current.z - r.z)
      if (d < bestD) {
        bestD = d
        best = r.id
      }
    }
    useRobots.getState().setNear(best)
  })
  return null
}

export function Robots() {
  return (
    <group>
      {ROBOTS.map((r, i) => (
        <RobotUnit key={r.id} def={r} index={i} />
      ))}
      <GreetProbe />
    </group>
  )
}