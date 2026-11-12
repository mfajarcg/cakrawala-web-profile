import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { STATIONS } from '../journey/stations'
import { useJourney } from '../journey/store'
import { Character } from './Character'
import { getPath } from './path'
import { characterPos } from './shared'
import { Stations } from './Stations'

const ISO_OFFSET = new THREE.Vector3(16, 16, 16)
// screen-right direction in world space for our fixed iso camera
const SCREEN_RIGHT = new THREE.Vector3(-1, 0, 1).normalize()

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)

  useEffect(() => {
    // zoom grows with viewport so the world stays readable 390px → 3840px
    const zoom = THREE.MathUtils.clamp(size.width / 30, 14, 44)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, size])

  const lookTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const { activeStation } = useJourney.getState()
    const station = STATIONS[activeStation]
    // shift the camera target toward the panel side so the character
    // lands on the free third of the screen instead of behind the card
    const sideSign = station.side === 'left' ? 1 : -1
    lookTarget
      .copy(characterPos.current)
      .addScaledVector(SCREEN_RIGHT, sideSign * 5.5)
    camera.position.set(
      lookTarget.x + ISO_OFFSET.x,
      ISO_OFFSET.y,
      lookTarget.z + ISO_OFFSET.z,
    )
    camera.lookAt(lookTarget.x, 0, lookTarget.z)
  })
  return null
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
  return (
    <div className="fixed inset-0 -z-10" aria-hidden="true">
      <CanvasSetup />
    </div>
  )
}

function CanvasSetup() {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [16, 16, 16], zoom: 30, near: -100, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#e9eff3']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[12, 24, 8]} intensity={1.15} />
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[130, -0.05, 0]}>
        <planeGeometry args={[420, 220]} />
        <meshStandardMaterial color="#dfe8ec" flatShading />
      </mesh>
      <gridHelper args={[420, 105, '#cfdce2', '#cfdce2']} position={[130, 0, 0]} />
      <PathRibbon />
      <Stations />
      <Character />
      <CameraRig />
    </Canvas>
  )
}
