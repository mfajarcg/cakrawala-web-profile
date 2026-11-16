import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Arena } from '../game/Arena'
import { GameScene } from '../game/GameScene'
import { useGame } from '../game/store'
import { STATIONS } from '../journey/stations'
import { useJourney } from '../journey/store'
import { Character } from './Character'
import { getPath } from './path'
import { characterPos, characterYaw } from './shared'
import { Stations } from './Stations'

const ISO_OFFSET = new THREE.Vector3(16, 16, 16)
// screen-right direction in world space for our fixed iso camera
const SCREEN_RIGHT = new THREE.Vector3(-1, 0, 1).normalize()
const EYE_HEIGHT = 1.68
// lateral viewpoint shift between station sides — eased with the same
// acceleration-capped velocity model as the character so the camera
// translation has a natural accel/decel instead of snapping
const LAT_MAX_SPEED = 13 // world units/s
const LAT_ACCELERATION = 26 // world units/s^2

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pov = useJourney((s) => s.pov)
  const lat = useRef({
    value: (STATIONS[0].side === 'left' ? 1 : -1) * 5.5,
    vel: 0,
  })

  useEffect(() => {
    if (pov !== 'follow' || !(camera instanceof THREE.OrthographicCamera)) return
    // zoom grows with viewport so the world stays readable 390px → 3840px
    const zoom = THREE.MathUtils.clamp(size.width / 26, 14, 64)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, size, pov])

  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const eye = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    if (pov === 'fp') {
      // first-person: eye at head height, looking along the facing direction
      eye.set(
        characterPos.current.x,
        EYE_HEIGHT,
        characterPos.current.z,
      )
      camera.position.copy(eye)
      camera.lookAt(
        eye.x + Math.sin(characterYaw.current),
        EYE_HEIGHT,
        eye.z + Math.cos(characterYaw.current),
      )
      return
    }
    const dt = Math.min(delta, 0.05)
    const { activeStation } = useJourney.getState()
    const station = STATIONS[activeStation]
    // shift the camera target toward the panel side so the character
    // lands on the free third of the screen instead of behind the card
    const desired = (station.side === 'left' ? 1 : -1) * 5.5
    const l = lat.current
    const latDiff = desired - l.value
    const desiredVel = THREE.MathUtils.clamp(latDiff * 4, -LAT_MAX_SPEED, LAT_MAX_SPEED)
    l.vel += THREE.MathUtils.clamp(desiredVel - l.vel, -LAT_ACCELERATION * dt, LAT_ACCELERATION * dt)
    l.value += l.vel * dt
    lookTarget.copy(characterPos.current).addScaledVector(SCREEN_RIGHT, l.value)
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
  const light = useRef<THREE.DirectionalLight>(null)
  const mix = useRef(0)
  const sky = useMemo(() => new THREE.Color('#e9eff3'), [])
  const daySky = useMemo(() => new THREE.Color('#e9eff3'), [])
  const dawnSky = useMemo(() => new THREE.Color('#f5e2c4'), [])
  const dayLight = useMemo(() => new THREE.Color('#ffffff'), [])
  const dawnLight = useMemo(() => new THREE.Color('#ffd9a0'), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const target = inGame && dawn ? 1 : 0
    mix.current = THREE.MathUtils.damp(mix.current, target, 1.1, dt)
    const m = mix.current
    sky.copy(daySky).lerp(dawnSky, m)
    scene.background = sky
    if (light.current) {
      light.current.color.copy(dayLight).lerp(dawnLight, m)
      light.current.intensity = 1.15 + 0.4 * m
    }
  })

  return <directionalLight ref={light} position={[12, 24, 8]} intensity={1.15} />
}

function PathRibbon() {
  const geometry = useMemo(() => {
    const curve = getPath()
    const tube = new THREE.TubeGeometry(curve, 120, 1.3, 8, false)
    tube.scale(1, 0.01, 1) // flatten the tube into a ribbon
    return tube
  }, [])
  return (
    <mesh geometry={geometry} position={[0, 0.02, 0]}>
      <meshStandardMaterial color="#ffffff" flatShading />
    </mesh>
  )
}

export function World() {
  const mode = useGame((s) => s.mode)
  return (
    <div
      className={`fixed inset-0 ${mode === 'game' ? 'z-10' : '-z-10'}`}
      aria-hidden="true"
    >
      <CanvasSetup />
    </div>
  )
}

function CanvasSetup() {
  const pov = useJourney((s) => s.pov)
  const mode = useGame((s) => s.mode)
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
        fov={65}
        near={0.1}
        far={200}
      />
      <color attach="background" args={['#e9eff3']} />
      <ambientLight intensity={0.95} />
      <Atmosphere />
      {/* one world for both modes: play mode only adds the player controller */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[65, -0.05, 0]}>
        <planeGeometry args={[320, 180]} />
        <meshStandardMaterial color="#dfe8ec" flatShading />
      </mesh>
      <gridHelper args={[320, 80, '#cfdce2', '#cfdce2']} position={[65, 0, 0]} />
      <PathRibbon />
      <Stations />
      <Arena />
      {inGame ? <GameScene /> : <CameraRig />}
      <Character />
    </Canvas>
  )
}
