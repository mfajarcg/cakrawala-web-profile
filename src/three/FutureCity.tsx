import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { atmoMix, cameraColliders } from './shared'

const NEON = ['#35c4ff', '#f2b23c', '#ff5ea8', '#5aa66f', '#7ea6d8', '#ff6b5e']
const SHELL = ['#16222e', '#1b2a38', '#20303f']

function mulberry(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Tower {
  x: number
  z: number
  h: number
  w: number
  d: number
  shell: string
  hue: string
  side: number
}

function useTowers(): Tower[] {
  return useMemo(() => {
    const rnd = mulberry(2045)
    const out: Tower[] = []
    for (let i = 0; i < 22; i++) {
      const side = i % 2 === 0 ? -1 : 1
      out.push({
        x: -8 + i * 7.1 + rnd() * 3,
        z: side * (27 + rnd() * 10),
        h: 9 + rnd() * 17,
        w: 3 + rnd() * 3,
        d: 3 + rnd() * 3,
        shell: SHELL[i % SHELL.length],
        hue: NEON[i % NEON.length],
        side,
      })
    }
    return out
  }, [])
}

/** lit windows as one instanced draw call, unlit so they read day and night */
function TowerWindows({ towers }: { towers: Tower[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const cells = useMemo(() => {
    const rnd = mulberry(7)
    const list: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3(1, 1, 1)
    for (const t of towers) {
      const rows = Math.floor(t.h / 2.4)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 3; c++) {
          const lx = (c - 1) * (t.w / 3.4)
          // both street-facing and outer faces stay lit: the journey orbit
          // looks at the city from outside, the roam camera from inside
          for (const face of [-1, 1]) {
            const lz = face * (t.d / 2 + 0.04)
            p.set(t.x + lx, 1.6 + r * 2.4, t.z + lz)
            list.push({
              m: new THREE.Matrix4().compose(p, q, s),
              c: new THREE.Color(rnd() < 0.42 ? t.hue : rnd() < 0.5 ? '#ffd9a0' : '#1a2634'),
            })
          }
        }
      }
    }
    return list
  }, [towers])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    cells.forEach((cell, i) => {
      mesh.setMatrixAt(i, cell.m)
      mesh.setColorAt(i, cell.c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [cells])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cells.length]} frustumCulled={false}>
      <boxGeometry args={[0.62, 0.34, 0.06]} />
      <meshBasicMaterial toneMapped={false} fog={false} />
    </instancedMesh>
  )
}

function Skyline() {
  const towers = useTowers()
  const bodies = useRef<THREE.Group>(null)
  useEffect(() => {
    if (bodies.current) cameraColliders.push(bodies.current)
    return () => {
      const i = cameraColliders.indexOf(bodies.current!)
      if (i >= 0) cameraColliders.splice(i, 1)
    }
  }, [])
  return (
    <group>
      <group ref={bodies}>
      {towers.map((t, i) => (
        <group key={i}>
          <mesh position={[t.x, t.h / 2, t.z]}>
            <boxGeometry args={[t.w, t.h, t.d]} />
            <meshStandardMaterial color={t.shell} flatShading />
          </mesh>
          {/* neon crown strip + rooftop beacon */}
          <mesh position={[t.x, t.h + 0.08, t.z]}>
            <boxGeometry args={[t.w + 0.12, 0.16, t.d + 0.12]} />
            <meshBasicMaterial color={t.hue} toneMapped={false} fog={false} />
          </mesh>
          <mesh position={[t.x, t.h + 0.7, t.z]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshBasicMaterial color={i % 2 ? '#ff6b5e' : t.hue} toneMapped={false} fog={false} />
          </mesh>
        </group>
      ))}
      </group>
      <TowerWindows towers={towers} />
    </group>
  )
}

/** Monas, still the axis of the city — flame now burns light instead of gold leaf */
function Monas() {
  return (
    <group position={[65, 0, -34]} scale={0.62}>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[6, 1.2, 6]} />
        <meshStandardMaterial color="#dfe8ec" flatShading />
      </mesh>
      <mesh position={[0, 11.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.7, 1.5, 20, 4]} />
        <meshStandardMaterial color="#e8eef2" flatShading />
      </mesh>
      <mesh position={[0, 21.6, 0]}>
        <boxGeometry args={[2.2, 1, 2.2]} />
        <meshStandardMaterial color="#dfe8ec" flatShading />
      </mesh>
      <mesh position={[0, 23.1, 0]}>
        <coneGeometry args={[0.8, 2.2, 8]} />
        <meshStandardMaterial
          color="#ffd9a0"
          emissive="#f2b23c"
          emissiveIntensity={2.2}
          toneMapped={false}
          flatShading
        />
      </mesh>
      <mesh position={[0, 22.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.06, 8, 40]} />
        <meshBasicMaterial color="#f2b23c" toneMapped={false} fog={false} />
      </mesh>
      <pointLight position={[0, 23, 0]} color="#f2b23c" intensity={60} distance={50} decay={2} />
    </group>
  )
}

function boardTexture(text: string, hue: string) {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 256
  const g = cv.getContext('2d')!
  g.fillStyle = '#0b1216'
  g.fillRect(0, 0, 512, 256)
  g.strokeStyle = hue
  g.lineWidth = 10
  g.strokeRect(10, 10, 492, 236)
  g.font = '900 72px system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = hue
  g.shadowBlur = 26
  g.fillStyle = hue
  g.fillText(text, 256, 118)
  g.shadowBlur = 0
  g.font = '700 30px system-ui, sans-serif'
  g.fillStyle = '#9fb4c4'
  g.fillText('· · ·', 256, 196)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function Billboard({
  text,
  hue,
  position,
  flip,
}: {
  text: string
  hue: string
  position: [number, number, number]
  flip?: boolean
}) {
  const tex = useMemo(() => boardTexture(text, hue), [text, hue])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <group position={position} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[7.4, 3.9, 0.18]} />
        <meshStandardMaterial color="#101418" flatShading />
      </mesh>
      <mesh>
        <planeGeometry args={[7, 3.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, -2.6, -0.1]}>
        <cylinderGeometry args={[0.12, 0.16, 2.2, 6]} />
        <meshStandardMaterial color="#22303a" flatShading />
      </mesh>
    </group>
  )
}

/** elevated people-mover looping the skyline, windows glowing */
function SkyTrain() {
  const train = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (train.current) train.current.position.x = -22 + ((state.clock.elapsedTime * 9) % 184)
  })
  return (
    <group position={[0, 0, -16]}>
      <mesh position={[65, 6.5, 0]}>
        <boxGeometry args={[164, 0.45, 0.9]} />
        <meshStandardMaterial color="#22303a" flatShading />
      </mesh>
      <mesh position={[65, 6.76, 0]}>
        <boxGeometry args={[164, 0.07, 0.94]} />
        <meshBasicMaterial color="#35c4ff" toneMapped={false} fog={false} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-10 + i * 16, 3.2, 0]}>
          <cylinderGeometry args={[0.22, 0.34, 6.4, 6]} />
          <meshStandardMaterial color="#1b2a38" flatShading />
        </mesh>
      ))}
      <group ref={train} position={[-22, 7.3, 0]}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[i * 3.7, 0, 0]}>
            <mesh>
              <boxGeometry args={[3.3, 1.1, 1.1]} />
              <meshStandardMaterial color="#e8eef2" flatShading />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[3.1, 0.34, 1.14]} />
              <meshBasicMaterial color="#7fd0ff" toneMapped={false} fog={false} />
            </mesh>
          </group>
        ))}
        <mesh position={[-1.9, -0.1, 0]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} fog={false} />
        </mesh>
      </group>
    </group>
  )
}

const LANES = [
  { z: -10, y: 6.5, dir: 1, speed: 9 },
  { z: -22, y: 9, dir: -1, speed: 12 },
  { z: 12, y: 7.5, dir: 1, speed: 7.5 },
  { z: 24, y: 11, dir: -1, speed: 10.5 },
  { z: 2, y: 13, dir: 1, speed: 14 },
]

function FlyingCars() {
  const refs = useRef<(THREE.Group | null)[]>([])
  const cars = useMemo(
    () =>
      LANES.flatMap((lane, li) =>
        [0, 1].map((k) => ({
          lane,
          hue: NEON[(li + k) % NEON.length],
          start: li * 31 + k * 83,
          bob: li * 1.7 + k * 2.9,
        })),
      ),
    [],
  )

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__cityDebug = { cars: refs.current }
    return () => {
      delete w.__cityDebug
    }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    cars.forEach((c, i) => {
      const g = refs.current[i]
      if (!g) return
      const span = 180
      const raw = c.start + t * c.lane.speed * c.lane.dir
      const x = ((((raw + 25) % span) + span) % span) - 25
      g.position.set(x, c.lane.y + Math.sin(t * 1.7 + c.bob) * 0.2, c.lane.z)
      g.rotation.y = c.lane.dir > 0 ? 0 : Math.PI
    })
  })

  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)}>
          <mesh>
            <boxGeometry args={[1.7, 0.32, 0.85]} />
            <meshStandardMaterial color="#2a3a48" flatShading />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <boxGeometry args={[0.7, 0.22, 0.6]} />
            <meshBasicMaterial color="#9fd8ff" toneMapped={false} fog={false} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[1.5, 0.1, 0.7]} />
            <meshBasicMaterial color={c.hue} toneMapped={false} fog={false} />
          </mesh>
          <mesh position={[-2.1, 0, 0]}>
            <boxGeometry args={[3.2, 0.09, 0.09]} />
            <meshBasicMaterial color={c.hue} transparent opacity={0.8} toneMapped={false} fog={false} />
          </mesh>
          <mesh position={[0.9, 0, 0]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** city-light horizon: a gradient dome so the sky never reads as flat paint */
function HorizonGlow() {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 4
    cv.height = 256
    const g = cv.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#0d1524')
    grad.addColorStop(0.25, '#0d1524')
    grad.addColorStop(0.4, '#14283c')
    grad.addColorStop(0.55, '#1d3a52')
    grad.addColorStop(0.68, '#2a4a66')
    grad.addColorStop(1, '#2a4a66')
    g.fillStyle = grad
    g.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame(() => {
    if (mat.current) mat.current.opacity = atmoMix.night
  })
  return (
    <mesh position={[65, 22, 0]} renderOrder={-1}>
      <cylinderGeometry args={[130, 130, 120, 48, 1, true]} />
      <meshBasicMaterial
        ref={mat}
        map={tex}
        side={THREE.BackSide}
        transparent
        opacity={0}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** neon kerb lines tracing the walkway through the dark asphalt */
function StreetGlow() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#35c4ff',
        transparent: true,
        opacity: 0,
        toneMapped: false,
        fog: false,
      }),
    [],
  )
  useFrame(() => {
    mat.opacity = 0.45 * atmoMix.night
  })
  return (
    <group>
      {[-5.6, 5.6].map((z) => (
        <mesh key={z} position={[65, 0.03, z]} material={mat}>
          <boxGeometry args={[150, 0.02, 0.12]} />
        </mesh>
      ))}
    </group>
  )
}

function Stars() {
  const mat = useRef<THREE.PointsMaterial>(null)
  const positions = useMemo(() => {
    const rnd = mulberry(99)
    const count = 220
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2
      const r = 90 + rnd() * 50
      pos[i * 3] = 65 + Math.cos(a) * r
      pos[i * 3 + 1] = 24 + rnd() * 70
      pos[i * 3 + 2] = Math.sin(a) * r
    }
    return pos
  }, [])
  useFrame(() => {
    if (mat.current) mat.current.opacity = atmoMix.night * 0.9
  })
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.55}
        color="#cfe4ff"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        fog={false}
      />
    </points>
  )
}

export function FutureCity() {
  return (
    <group>
      <HorizonGlow />
      <StreetGlow />
      <Skyline />
      <Monas />
      <Billboard text="JAKARTA 2045" hue="#35c4ff" position={[20, 13, -24]} />
      <Billboard text="CAKRAWALA" hue="#f2b23c" position={[70, 15, 26]} flip />
      <Billboard text="NUSANTARA AI" hue="#ff5ea8" position={[110, 12, -26]} />
      <SkyTrain />
      <FlyingCars />
      <Stars />
    </group>
  )
}