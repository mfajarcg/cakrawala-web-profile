import { OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { STATIONS } from '../journey/stations'
import { useJourney } from '../journey/store'
import { Character } from './Character'
import { getPath } from './path'
import { characterPos, characterYaw } from './shared'
import { Stations } from './Stations'

const ISO_OFFSET = new THREE.Vector3(16, 16, 16)
// screen-right direction in world space for our fixed iso camera
const SCREEN_RIGHT = new THREE.Vector3(-1, 0, 1).normalize()
const EYE_HEIGHT = 1.45

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pov = useJourney((s) => s.pov)

  useEffect(() => {
    if (pov !== 'follow' || !(camera instanceof THREE.OrthographicCamera)) return
    // zoom grows with viewport so the world stays readable 390px → 3840px
    const zoom = THREE.MathUtils.clamp(size.width / 26, 14, 64)
    camera.zoom = zoom
    camera.updateProjectionMatrix()
  }, [camera, size, pov])

  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const eye = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
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
  const pov = useJourney((s) => s.pov)
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <OrthographicCamera
        makeDefault={pov === 'follow'}
        position={[16, 16, 16]}
        zoom={30}
        near={-100}
        far={200}
      />
      <PerspectiveCamera
        makeDefault={pov === 'fp'}
        fov={65}
        near={0.1}
        far={200}
      />
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
