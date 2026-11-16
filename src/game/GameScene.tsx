import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { STATIONS } from '../journey/stations'
import { cadenceFor, characterPos, characterYaw, gait } from '../three/shared'
import { input } from './input'
import {
  ARENA_HALF,
  ARENA_MAX_Y,
  BLOCK_COLORS,
  BLOCK_KINDS,
  cellKey,
  useGame,
  type BlockKind,
  type Cell,
} from './store'

// the arena is built on the play checkpoint so the player keeps their bearings
const PLAY = STATIONS.find((s) => s.id === 'play')!
const ORIGIN = { x: PLAY.x, z: PLAY.z - 4 }

const WALK_SPEED = 3.6
const RUN_SPEED = 7.4
const ACCELERATION = 16
const GRAVITY = 24
const JUMP_SPEED = 7.6
const PLAYER_RADIUS = 0.34
const PLAYER_HEIGHT = 1.72
const CAMERA_DISTANCE = 5.4
const CAMERA_HEIGHT = 1.9

/** player state lives outside React so leaving and re-entering keeps the pose */
const player = {
  // offset half a cell so the centre ray never runs along a block boundary
  x: 0.5,
  z: 7,
  y: 0,
  vx: 0,
  vz: 0,
  vy: 0,
  /** camera orbit around the player */
  yaw: 0,
  pitch: 0.24,
  /** body facing */
  facing: 0,
  phase: 0,
}

const _ndc = new THREE.Vector2()

const damp = THREE.MathUtils.damp
const clamp = THREE.MathUtils.clamp

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

function blockGeometry() {
  return new THREE.BoxGeometry(0.96, 0.96, 0.96)
}

export function GameScene() {
  const blocks = useGame((s) => s.blocks)
  const place = useGame((s) => s.place)
  const remove = useGame((s) => s.remove)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const blocksRef = useRef<THREE.Group>(null)
  const floorRef = useRef<THREE.Mesh>(null)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const geometry = useMemo(blockGeometry, [])
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

  const occupancy = useMemo(() => {
    const map = new Map<string, BlockKind>()
    for (const b of blocks) map.set(cellKey(b), b.kind)
    return map
  }, [blocks])

  const occupancyRef = useRef(occupancy)
  occupancyRef.current = occupancy

  // --- pointer: click locks the camera, then LMB breaks / RMB places
  useEffect(() => {
    const el = gl.domElement
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return
      if (document.pointerLockElement === el) {
        input.breakQueued = true
        return
      }
      if (input.freeAim) {
        const rect = el.getBoundingClientRect()
        input.aimX = ((e.clientX - rect.left) / rect.width) * 2 - 1
        input.aimY = -((e.clientY - rect.top) / rect.height) * 2 + 1
        input.breakQueued = true
        return
      }
      const rect = el.getBoundingClientRect()
      _ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      input.aimX = _ndc.x
      input.aimY = _ndc.y
      el.requestPointerLock?.()
      // pointer lock can be refused (iframes, permissions); fall back to
      // cursor aiming so breaking and placing still work
      window.setTimeout(() => {
        if (document.pointerLockElement !== el) input.freeAim = true
      }, 600)
    }
    const onContext = (e: MouseEvent) => {
      // keep the native menu away; the placement itself is handled on mousedown
      // because pointer lock suppresses contextmenu in some browsers
      e.preventDefault()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return
      e.preventDefault()
      if (document.pointerLockElement === el) {
        input.placeQueued = true
      } else if (input.freeAim) {
        const rect = el.getBoundingClientRect()
        input.aimX = ((e.clientX - rect.left) / rect.width) * 2 - 1
        input.aimY = -((e.clientY - rect.top) / rect.height) * 2 + 1
        input.placeQueued = true
      }
    }
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return
      input.lookX += e.movementX
      input.lookY += e.movementY
    }
    const onLockError = () => {
      input.freeAim = true
    }
    el.addEventListener('click', onClick)
    el.addEventListener('contextmenu', onContext)
    el.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('pointerlockerror', onLockError)
    return () => {
      el.removeEventListener('click', onClick)
      el.removeEventListener('contextmenu', onContext)
      el.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('pointerlockerror', onLockError)
      if (document.pointerLockElement === el) document.exitPointerLock()
    }
  }, [gl])

  /** top of the highest block at a cell coordinate, else the arena floor */
  const surfaceAt = (x: number, z: number) => {
    const cx = Math.floor(x)
    const cz = Math.floor(z)
    let top = 0
    for (let y = ARENA_MAX_Y - 1; y >= 0; y--) {
      if (occupancyRef.current.has(`${cx},${y},${cz}`)) {
        top = y + 1
        break
      }
    }
    return top
  }

  const blocked = (x: number, z: number, feetY: number) => {
    const cx = Math.floor(x)
    const cz = Math.floor(z)
    const minY = Math.floor(feetY + 0.6)
    const maxY = Math.floor(feetY + PLAYER_HEIGHT)
    for (let y = minY; y <= maxY; y++) {
      if (occupancyRef.current.has(`${cx},${y},${cz}`)) return true
    }
    return false
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)

    // --- look
    player.yaw -= input.lookX * 0.0026
    player.pitch = clamp(player.pitch + input.lookY * 0.0022, -0.4, 1.05)
    input.lookX = 0
    input.lookY = 0

    // --- movement, camera-relative
    const f = clamp(input.forward, -1, 1)
    const s = clamp(input.strafe, -1, 1)
    const magnitude = Math.hypot(f, s)
    const fwdX = -Math.sin(player.yaw)
    const fwdZ = -Math.cos(player.yaw)
    const rightX = -fwdZ
    const rightZ = fwdX
    const maxSpeed = input.run ? RUN_SPEED : WALK_SPEED
    const dirX = magnitude > 0.01 ? ((fwdX * f + rightX * s) / magnitude) * maxSpeed : 0
    const dirZ = magnitude > 0.01 ? ((fwdZ * f + rightZ * s) / magnitude) * maxSpeed : 0
    player.vx = damp(player.vx, dirX, ACCELERATION, dt)
    player.vz = damp(player.vz, dirZ, ACCELERATION, dt)

    const limit = ARENA_HALF - PLAYER_RADIUS
    const nx = clamp(player.x + player.vx * dt, -limit, limit)
    if (!blocked(nx, player.z, player.y)) player.x = nx
    else player.vx = 0
    const nz = clamp(player.z + player.vz * dt, -limit, limit)
    if (!blocked(player.x, nz, player.y)) player.z = nz
    else player.vz = 0

    // --- jump & gravity
    const ground = surfaceAt(player.x, player.z)
    if (input.jumpQueued) {
      input.jumpQueued = false
      if (player.y <= ground + 0.04) player.vy = JUMP_SPEED
    }
    player.vy -= GRAVITY * dt
    player.y += player.vy * dt
    const landing = surfaceAt(player.x, player.z)
    if (player.y <= landing) {
      player.y = landing
      player.vy = 0
    }

    // --- publish pose for the shared rigged model
    const speed = Math.hypot(player.vx, player.vz)
    if (speed > 0.15) {
      player.facing = dampAngle(player.facing, Math.atan2(player.vx, player.vz), 12, dt)
    }
    const speedNorm = clamp(speed / RUN_SPEED, 0, 1)
    player.phase += cadenceFor(speed, speedNorm) * Math.PI * 2 * dt

    const surface = surfaceAt(player.x, player.z)
    characterPos.current.set(ORIGIN.x + player.x, surface, ORIGIN.z + player.z)
    characterYaw.current = player.facing
    gait.phase = player.phase
    gait.speedNorm = speedNorm
    gait.moving = speed > 0.15 ? 1 : 0
    gait.lift = player.y - surface

    // --- third-person camera
    const horizontal = Math.cos(player.pitch) * CAMERA_DISTANCE
    const eyeY = player.y + CAMERA_HEIGHT + Math.sin(player.pitch) * CAMERA_DISTANCE
    camera.position.set(
      ORIGIN.x + player.x + Math.sin(player.yaw) * horizontal,
      eyeY,
      ORIGIN.z + player.z + Math.cos(player.yaw) * horizontal,
    )
    camera.lookAt(ORIGIN.x + player.x, player.y + 1.15, ORIGIN.z + player.z)

    // --- build / destroy
    if (input.breakQueued || input.placeQueued) {
      const isBreak = input.breakQueued
      input.breakQueued = false
      input.placeQueued = false
      const locked = document.pointerLockElement != null || input.freeAim
      _ndc.set(locked ? 0 : input.aimX, locked ? 0 : input.aimY)
      raycaster.setFromCamera(_ndc, camera)
      const targets: THREE.Object3D[] = blocksRef.current
        ? [...blocksRef.current.children]
        : []
      if (floorRef.current) targets.push(floorRef.current)
      const hit = raycaster.intersectObjects(targets, false)[0]
      if (!hit) return
      const normal = hit.face?.normal
      if (isBreak) {
        const cell = hit.object.userData.cell as Cell | undefined
        if (cell) remove([cell])
        return
      }
      let target: Cell
      const cell = hit.object.userData.cell as Cell | undefined
      if (cell && normal) {
        target = { x: cell.x + normal.x, y: cell.y + normal.y, z: cell.z + normal.z }
      } else {
        const p = hit.point
        target = {
          x: Math.floor(p.x - ORIGIN.x),
          y: 0,
          z: Math.floor(p.z - ORIGIN.z),
        }
      }
      if (
        Math.abs(target.x) > ARENA_HALF ||
        Math.abs(target.z) > ARENA_HALF ||
        target.y < 0 ||
        target.y >= ARENA_MAX_Y ||
        occupancyRef.current.has(cellKey(target))
      ) {
        return
      }
      // never trap the player inside a freshly placed block
      const overlapsPlayer =
        target.y + 1 > player.y + 0.08 &&
        target.y < player.y + PLAYER_HEIGHT &&
        Math.abs(target.x + 0.5 - player.x) < 0.9 &&
        Math.abs(target.z + 0.5 - player.z) < 0.9
      if (overlapsPlayer) return
      place([target])
    }
  })

  const arenaSize = ARENA_HALF * 2 + 2
  const wallHeight = 1.4

  return (
    <group position={[ORIGIN.x, 0, ORIGIN.z]}>
      {/* floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[arenaSize, arenaSize]} />
        <meshStandardMaterial color="#e3ebe7" roughness={0.95} />
      </mesh>
      <gridHelper
        args={[arenaSize, arenaSize, '#b9cbc2', '#cfdbd5']}
        position={[0, 0.02, 0]}
      />
      {/* low walls keep the player in the build area */}
      {[
        [0, -ARENA_HALF - 0.5],
        [0, ARENA_HALF + 0.5],
        [-ARENA_HALF - 0.5, 0],
        [ARENA_HALF + 0.5, 0],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, wallHeight / 2, z]}>
          <boxGeometry
            args={i < 2 ? [arenaSize + 1, wallHeight, 0.6] : [0.6, wallHeight, arenaSize + 1]}
          />
          <meshStandardMaterial color="#408fb4" roughness={0.7} />
        </mesh>
      ))}
      {/* existing painted blocks stay visible while walking around */}
      <group ref={blocksRef}>
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
    </group>
  )
}
