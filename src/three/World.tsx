import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import * as THREE from 'three'
import { PovButton } from '../blocks/PovButton'
import { Arena } from '../game/Arena'
import { GameScene } from '../game/GameScene'
import { useGame } from '../game/store'
import { scrollBridge } from '../journey/scroll'
import { STATIONS } from '../journey/stations'
import { useJourney } from '../journey/store'
import { Character } from './Character'
import { FutureCity } from './FutureCity'
import { getPath } from './path'
import { Robots } from './Robots'
import { atmoMix, characterPos, characterYaw } from './shared'
import { Stations } from './Stations'

const ISO_OFFSET = new THREE.Vector3(16, 16, 16)
const EYE_HEIGHT = 1.68

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pov = useJourney((s) => s.pov)

  useEffect(() => {
    if (pov !== 'follow' || !(camera instanceof THREE.OrthographicCamera)) return
    // frame the character against the smaller pane dimension so it stays
    // prominent whether the world fills a 54% desktop column or a tiny PiP
    const zoom = THREE.MathUtils.clamp(Math.min(size.width, size.height) / 10, 24, 96)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, size, pov])

  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const eye = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (pov === 'fp') {
      eye.set(characterPos.current.x, EYE_HEIGHT, characterPos.current.z)
      camera.position.copy(eye)
      camera.lookAt(
        eye.x + Math.sin(characterYaw.current),
        EYE_HEIGHT,
        eye.z + Math.cos(characterYaw.current),
      )
      return
    }
    // the whole right pane is free space now — keep the character centred
    lookTarget.copy(characterPos.current)
    camera.position.set(
      lookTarget.x + ISO_OFFSET.x,
      ISO_OFFSET.y,
      lookTarget.z + ISO_OFFSET.z,
    )
    camera.lookAt(lookTarget.x, 0, lookTarget.z)
  })
  return null
}

/** dawn light once the horizon has been opened — the world remembers it */
function Atmosphere() {
  const scene = useThree((s) => s.scene)
  const inGame = useGame((s) => s.mode === 'game')
  const dawn = useGame((s) => s.vista || s.done)
  const adventure = useGame((s) => s.adventure)
  const light = useRef<THREE.DirectionalLight>(null)
  const ambient = useRef<THREE.AmbientLight>(null)
  const mix = useRef(0)
  const night = useRef(0)
  const sky = useMemo(() => new THREE.Color('#e9eff3'), [])
  const daySky = useMemo(() => new THREE.Color('#e9eff3'), [])
  const dawnSky = useMemo(() => new THREE.Color('#f5e2c4'), [])
  const nightSky = useMemo(() => new THREE.Color('#0d1524'), [])
  const dayLight = useMemo(() => new THREE.Color('#ffffff'), [])
  const dawnLight = useMemo(() => new THREE.Color('#ffd9a0'), [])
  const moonLight = useMemo(() => new THREE.Color('#8fb6e4'), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = inGame && dawn ? 1 : 0
    mix.current = THREE.MathUtils.damp(mix.current, target, 1.1, dt)
    night.current = THREE.MathUtils.damp(night.current, adventure ? 1 : 0, 1.4, dt)
    atmoMix.night = night.current
    const m = mix.current
    const n = night.current
    sky.copy(daySky).lerp(dawnSky, m).lerp(nightSky, n)
    scene.background = sky
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(sky)
    if (light.current) {
      light.current.color.copy(dayLight).lerp(dawnLight, m).lerp(moonLight, n)
      light.current.intensity = 1.15 + 0.4 * m - 0.6 * n
    }
    if (ambient.current) ambient.current.intensity = 0.95 - 0.55 * n
  })

  return (
    <>
      <directionalLight ref={light} position={[12, 24, 8]} intensity={1.15} />
      <ambientLight ref={ambient} intensity={0.95} />
    </>
  )
}

/** the walkway turns to dark asphalt after dark so the neon carries the scene */
function GroundPlane() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const day = useMemo(() => new THREE.Color('#dfe8ec'), [])
  const night = useMemo(() => new THREE.Color('#141c26'), [])
  useFrame(() => {
    if (mat.current) mat.current.color.copy(day).lerp(night, atmoMix.night)
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[65, -0.05, 0]}>
      <planeGeometry args={[320, 180]} />
      <meshStandardMaterial ref={mat} color="#dfe8ec" flatShading />
    </mesh>
  )
}

/** the grid dims to blue steel after dark instead of glaring white */
function GroundGrid() {
  const ref = useRef<THREE.GridHelper>(null)
  const day = useMemo(() => new THREE.Color('#ffffff'), [])
  const night = useMemo(() => new THREE.Color('#20304a'), [])
  useFrame(() => {
    const mat = ref.current?.material as THREE.LineBasicMaterial | undefined
    if (mat) mat.color.copy(day).lerp(night, atmoMix.night)
  })
  return <gridHelper ref={ref} args={[320, 80, '#cfdce2', '#cfdce2']} position={[65, 0, 0]} />
}

/** warm dust motes drifting around the walker — journey-mode atmosphere only */
function JourneyDust() {
  const ref = useRef<THREE.Group>(null)
  const positions = useMemo(() => {
    const count = 90
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = Math.random() * 7 + 0.3
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28
    }
    return pos
  }, [])
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.set(
      characterPos.current.x,
      Math.sin(t * 0.4) * 0.3,
      characterPos.current.z,
    )
    ref.current.rotation.y = t * 0.02
  })
  return (
    <group ref={ref}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          color="#f2b23c"
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

function PathRibbon() {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const day = useMemo(() => new THREE.Color('#ffffff'), [])
  const night = useMemo(() => new THREE.Color('#33465c'), [])
  const geometry = useMemo(() => {
    const curve = getPath()
    const tube = new THREE.TubeGeometry(curve, 120, 1.3, 8, false)
    tube.scale(1, 0.01, 1) // flatten the tube into a ribbon
    return tube
  }, [])
  useFrame(() => {
    if (mat.current) mat.current.color.copy(day).lerp(night, atmoMix.night)
  })
  return (
    <mesh geometry={geometry} position={[0, 0.02, 0]}>
      <meshStandardMaterial ref={mat} color="#ffffff" flatShading />
    </mesh>
  )
}

/** slim clickable checkpoint rail on the inner edge of the desktop 3D pane */
function StationRail() {
  const active = useJourney((s) => s.activeStation)
  return (
    <div className="absolute left-2.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
      {STATIONS.map((s, i) => (
        <button
          key={s.id}
          onClick={() => scrollBridge.toStation(i)}
          title={`Etape ${s.index} — ${s.id}`}
          aria-label={`Etape ${s.index}`}
          aria-current={i === active ? 'step' : undefined}
          className={`h-2.5 w-2.5 rounded-full border transition-all duration-200 ${
            i === active
              ? 'scale-125 border-[#d99a26] bg-[#f2b23c] shadow-[0_0_0.5rem_rgba(242,178,60,0.7)]'
              : 'border-[#2e6f8e]/40 bg-white/70 hover:scale-110 hover:bg-[#408fb4]'
          }`}
        />
      ))}
    </div>
  )
}

const PIP_KEY = 'cakrawala-pip-v1'
const PIP_HEADER = 28

interface PipState {
  x: number
  y: number
  expanded: boolean
}

function pipSize(expanded: boolean) {
  const vw = window.innerWidth
  const w = Math.round(expanded ? Math.min(vw * 0.86, 400) : Math.min(vw * 0.46, 210))
  return { w, h: Math.round(w * 1.18) }
}

function clampPos(x: number, y: number, w: number, h: number) {
  return {
    x: Math.max(4, Math.min(x, window.innerWidth - w - 4)),
    y: Math.max(4, Math.min(y, window.innerHeight - h - 4)),
  }
}

function defaultPip(): PipState {
  const { w, h } = pipSize(false)
  const pos = clampPos(window.innerWidth - w - 12, window.innerHeight - h - 12, w, h)
  return { x: pos.x, y: pos.y, expanded: false }
}

function loadPip(): PipState {
  try {
    const raw = localStorage.getItem(PIP_KEY)
    if (!raw) return defaultPip()
    const p = JSON.parse(raw) as Partial<PipState>
    const expanded = !!p.expanded
    const { w, h } = pipSize(expanded)
    const pos = clampPos(Number(p.x) || 0, Number(p.y) || 0, w, h)
    return { x: pos.x, y: pos.y, expanded }
  } catch {
    return defaultPip()
  }
}

function useDesktop() {
  const [desktop, setDesktop] = useState(
    () => window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

export function World() {
  const mode = useGame((s) => s.mode)
  const inGame = mode === 'game'
  const desktop = useDesktop()
  const pip = usePipFrame(inGame, desktop)

  let cls: string
  let style: CSSProperties = {}
  if (inGame) {
    cls = 'fixed inset-0 z-10 flex flex-col'
  } else if (desktop) {
    cls = 'fixed top-0 bottom-0 right-0 z-0 flex flex-col border-l border-[#101418]/10 shadow-[-1rem_0_3rem_rgba(16,20,24,0.07)]'
    style = { left: '46%' }
  } else {
    const { w, h } = pipSize(pip.state.expanded)
    cls = 'fixed z-20 flex flex-col overflow-hidden rounded-xl border border-[#101418]/15 bg-[#e9eff3] shadow-[0_0.75rem_2rem_rgba(16,20,24,0.3)]'
    style = { left: pip.state.x, top: pip.state.y, width: w, height: h, touchAction: 'none' }
  }

  return (
    <div
      className={cls}
      style={style}
      data-pip={!inGame && !desktop ? '' : undefined}
      aria-hidden={inGame ? 'true' : undefined}
    >
      {!inGame && !desktop && (
        <div
          className="flex shrink-0 cursor-grab items-center justify-between gap-1 border-b border-[#101418]/20 bg-[#101418]/85 px-2 text-white backdrop-blur active:cursor-grabbing"
          style={{ height: PIP_HEADER, touchAction: 'none' }}
          onPointerDown={pip.onPointerDown}
          onPointerMove={pip.onPointerMove}
          onPointerUp={pip.onPointerUp}
          onPointerCancel={pip.onPointerUp}
        >
          <span className="flex select-none items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <GripVertical size={12} className="opacity-70" />
            Dunia 3D
          </span>
          <button
            onClick={pip.toggleExpanded}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={pip.state.expanded ? 'Kecilkan jendela 3D' : 'Besarkan jendela 3D'}
            className="flex h-5 w-5 items-center justify-center rounded text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            {pip.state.expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <CanvasSetup />
        {!inGame && <PovButton />}
        {!inGame && desktop && <StationRail />}
      </div>
    </div>
  )
}

/** drag + expand + persistence for the mobile floating 3D window */
function usePipFrame(inGame: boolean, desktop: boolean) {
  const [state, setState] = useState<PipState>(loadPip)
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const latest = useRef(state)
  latest.current = state

  useEffect(() => {
    const onResize = () =>
      setState((p) => {
        const { w, h } = pipSize(p.expanded)
        return { ...p, ...clampPos(p.x, p.y, w, h) }
      })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const save = (p: PipState) => {
    try {
      localStorage.setItem(PIP_KEY, JSON.stringify(p))
    } catch {
      /* private mode — position just won't persist */
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, ox: latest.current.x, oy: latest.current.y }
    e.preventDefault()
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const { w, h } = pipSize(latest.current.expanded)
    const nx = drag.current.ox + (e.clientX - drag.current.px)
    const ny = drag.current.oy + (e.clientY - drag.current.py)
    setState((p) => ({ ...p, ...clampPos(nx, ny, w, h) }))
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    save(latest.current)
  }
  const toggleExpanded = () =>
    setState((p) => {
      const expanded = !p.expanded
      const { w, h } = pipSize(expanded)
      const next = { ...p, ...clampPos(p.x, p.y, w, h), expanded }
      save(next)
      return next
    })

  // keep the saved frame inside the viewport when returning to mobile
  useEffect(() => {
    if (!inGame && !desktop) {
      setState((p) => {
        const { w, h } = pipSize(p.expanded)
        return { ...p, ...clampPos(p.x, p.y, w, h) }
      })
    }
  }, [inGame, desktop])

  return { state, onPointerDown, onPointerMove, onPointerUp, toggleExpanded }
}

function CanvasSetup() {
  const pov = useJourney((s) => s.pov)
  const mode = useGame((s) => s.mode)
  const adventure = useGame((s) => s.adventure)
  const inGame = mode === 'game'

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: import.meta.env.DEV,
      }}
    >
      <OrthographicCamera
        makeDefault={!inGame && pov === 'follow'}
        position={[16, 16, 16]}
        zoom={30}
        near={-100}
        far={200}
      />
      <PerspectiveCamera
        makeDefault={inGame || pov === 'fp'}
        fov={inGame && adventure ? 75 : 65}
        near={0.1}
        far={200}
      />
      <color attach="background" args={['#e9eff3']} />
      <fog attach="fog" args={['#e9eff3', 45, 130]} />
      <Atmosphere />
      {!inGame && <JourneyDust />}
      {/* one world for both modes: play mode only adds the player controller */}
      <GroundPlane />
      <GroundGrid />
      <PathRibbon />
      <FutureCity />
      <Robots />
      <Stations />
      <Arena />
      {inGame ? <GameScene /> : <CameraRig />}
      <Character />
    </Canvas>
  )
}