import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { cadenceFor, characterPos, characterYaw, gait, gaitNorm, RUN_SPEED, teleport, adventureSpawn, tpWhoosh, TP_DUR, TP_VANISH, TP_WHOOSH } from '../three/shared'
import { input, lockState, resetInput, setTapAim } from './input'
import { ARENA_ORIGIN, arenaRefs } from './layout'
import { ARENA_HALF, ARENA_MAX_Y, cellKey, useGame, type BlockKind, type Cell } from './store'

const ORIGIN = ARENA_ORIGIN

const WALK_SPEED = 1.6
const ACCELERATION = 16
const GRAVITY = 24
const JUMP_SPEED = 7.6
// countermovement: braking dip ~0.2-0.3 s and landing absorption ~0.3 s,
// matching the force-time phases of a countermovement jump (Owen et al. 2018)
const CROUCH_S = 0.22
const LAND_S = 0.3
const PLAYER_RADIUS = 0.34
const PLAYER_HEIGHT = 1.72
const CAMERA_DISTANCE = 5.4
const CAMERA_HEIGHT = 1.9
// free roam pulls back and drops the eye line so the skyline stays in frame
const ROAM_DISTANCE = 7.6
const ROAM_HEIGHT = 2.5

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
  /** countermovement jump machine: 0 idle, 1 dip, 2 flight, 3 absorption */
  jumpState: 0,
  crouchT: 0,
  crouch: 0,
  airT: 0,
  landT: 0,
  impact: 0,
}

const _ndc = new THREE.Vector2()

const damp = THREE.MathUtils.damp
const clamp = THREE.MathUtils.clamp

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

export function GameScene() {
  const blocks = useGame((s) => s.blocks)
  const place = useGame((s) => s.place)
  const remove = useGame((s) => s.remove)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  const occupancy = useMemo(() => {
    const map = new Map<string, BlockKind>()
    for (const b of blocks) map.set(cellKey(b), b.kind)
    return map
  }, [blocks])

  const occupancyRef = useRef(occupancy)
  occupancyRef.current = occupancy

  // dev-only ground truth for the deterministic QA scripts
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__gameDebug = { player, camera, raycaster, gait, characterPos, characterYaw }
    return () => {
      delete w.__gameDebug
    }
  }, [camera, raycaster])

  // --- pointer: click locks the camera, then LMB breaks / RMB places
  useEffect(() => {
    const el = gl.domElement
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0) return
      const st = useGame.getState()
      if (st.paused || st.gate !== 'none' || st.result) return
      // touch never takes pointer lock: the lock retargets every click to the
      // canvas, which kills all HUD buttons. A tap aims instead.
      if (window.matchMedia('(pointer: coarse)').matches) {
        setTapAim(e.clientX, e.clientY)
        return
      }
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

  // losing the lock (Esc, alt-tab) opens the pause menu instead of leaving the
  // camera spinning with a hidden cursor
  useEffect(() => {
    const el = gl.domElement
    let wasLocked = document.pointerLockElement === el
    const onChange = () => {
      const locked = document.pointerLockElement === el
      if (wasLocked && !locked) {
        lockState.lastLostAt = performance.now()
        resetInput()
        // completion / run modals release the lock on purpose; not a pause
        const st = useGame.getState()
        if (!st.celebrate && st.gate === 'none' && !st.result) st.setPaused(true)
      }
      wasLocked = locked
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [gl])

  /** top of the highest block at a cell coordinate, else the arena floor */
  const surfaceAt = (x: number, z: number) => {
    const cx = Math.floor(x)
    const cz = Math.floor(z)
    // free roam walks the whole city; only the arena carries blocks
    if (useGame.getState().adventure && (Math.abs(cx) > ARENA_HALF || Math.abs(cz) > ARENA_HALF))
      return 0
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
    if (useGame.getState().adventure && (Math.abs(cx) > ARENA_HALF || Math.abs(cz) > ARENA_HALF))
      return false
    const minY = Math.floor(feetY + 0.6)
    const maxY = Math.floor(feetY + PLAYER_HEIGHT)
    for (let y = minY; y <= maxY; y++) {
      if (occupancyRef.current.has(`${cx},${y},${cz}`)) return true
    }
    return false
  }

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const st = useGame.getState()
    // the teleport sequence is journey grammar: only CharacterDriver advances
    // it in site mode. Free adventure drives its own station-jump beams here;
    // entering Play mid-sequence would freeze Eric mid-vanish, so hand over clean.
    if (!st.adventure && teleport.t >= 0) teleport.t = -1
    if (st.paused || st.gate !== 'none' || st.result) {
      player.vx = 0
      player.vz = 0
      gait.moving = 0
      input.lookX = 0
      input.lookY = 0
      return
    }

    // --- free adventure: spawn anywhere, station jumps ride the beam grammar
    if (st.adventure) {
      const sp = adventureSpawn
      if (sp.x != null && sp.z != null && !sp.beam && teleport.t < 0) {
        player.x = sp.x - ORIGIN.x
        player.z = sp.z - ORIGIN.z
        player.y = 0
        player.vy = 0
        player.jumpState = 0
        player.pitch = 0.02
        sp.x = null
        sp.z = null
      }
      if (sp.x != null && sp.z != null && sp.beam && teleport.t < 0) {
        teleport.from.copy(characterPos.current)
        teleport.to.set(sp.x, 0, sp.z)
        teleport.t = 0
      }
      if (teleport.t >= 0) {
        teleport.t += dt
        characterPos.current.lerpVectors(teleport.from, teleport.to, tpWhoosh(teleport.t))
        characterYaw.current = player.facing
        gait.moving = 0
        gait.move01 = 0
        gait.lift = 0
        player.vx = 0
        player.vz = 0
        if (sp.x != null && sp.z != null && teleport.t >= TP_VANISH + TP_WHOOSH * 0.5) {
          player.x = sp.x - ORIGIN.x
          player.z = sp.z - ORIGIN.z
          player.y = 0
          player.vy = 0
          player.jumpState = 0
          player.impact = 0
          sp.x = null
          sp.z = null
          sp.beam = false
        }
        if (teleport.t >= TP_DUR) teleport.t = -1
        const horiz = Math.cos(player.pitch) * ROAM_DISTANCE
        camera.position.set(
          characterPos.current.x + Math.sin(player.yaw) * horiz,
          characterPos.current.y + ROAM_HEIGHT + Math.sin(player.pitch) * ROAM_DISTANCE,
          characterPos.current.z + Math.cos(player.yaw) * horiz,
        )
        camera.lookAt(
          characterPos.current.x,
          characterPos.current.y + 1.15,
          characterPos.current.z,
        )
        return
      }
    }

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
    const minX = st.adventure ? -12 - ORIGIN.x : -limit
    const maxX = st.adventure ? 142 - ORIGIN.x : limit
    const minZ = st.adventure ? -44 - ORIGIN.z : -limit
    const maxZ = st.adventure ? 44 - ORIGIN.z : limit
    const nx = clamp(player.x + player.vx * dt, minX, maxX)
    if (!blocked(nx, player.z, player.y)) player.x = nx
    else player.vx = 0
    const nz = clamp(player.z + player.vz * dt, minZ, maxZ)
    if (!blocked(player.x, nz, player.y)) player.z = nz
    else player.vz = 0

    // --- countermovement jump: dip, explode, fly, absorb
    const ground = surfaceAt(player.x, player.z)
    if (input.jumpQueued) {
      input.jumpQueued = false
      if (player.jumpState === 0 && player.y <= ground + 0.04) {
        player.jumpState = 1
        player.crouchT = 0
      }
    }
    if (player.jumpState === 1) {
      player.crouchT += dt
      player.crouch = Math.sin(Math.min(player.crouchT / CROUCH_S, 1) * Math.PI * 0.5)
      if (player.crouchT >= CROUCH_S) {
        player.vy = JUMP_SPEED
        player.jumpState = 2
        player.airT = 0
      }
    } else if (player.jumpState === 2) {
      player.airT += dt
    }
    player.vy -= GRAVITY * dt
    player.y += player.vy * dt
    const landing = surfaceAt(player.x, player.z)
    if (player.y <= landing) {
      const hitSpeed = -player.vy
      // standing frames only bleed ~g·dt of velocity; a real touch-down is faster
      if (player.jumpState === 2 || (player.jumpState === 0 && hitSpeed > 3)) {
        player.impact = clamp(hitSpeed / JUMP_SPEED, 0, 1)
        player.jumpState = 3
        player.landT = 0
      }
      player.y = landing
      player.vy = 0
    }
    if (player.jumpState === 3) {
      player.landT += dt
      if (player.landT >= LAND_S) {
        player.jumpState = 0
        player.impact = 0
      }
    }

    // --- publish pose for the shared rigged model
    const speed = Math.hypot(player.vx, player.vz)
    if (speed > 0.15) {
      player.facing = dampAngle(player.facing, Math.atan2(player.vx, player.vz), 12, dt)
    }
    const speedNorm = gaitNorm(speed)
    player.phase += cadenceFor(speed, speedNorm) * Math.PI * 2 * dt

    const surface = surfaceAt(player.x, player.z)
    characterPos.current.set(ORIGIN.x + player.x, surface, ORIGIN.z + player.z)
    characterYaw.current = player.facing
    gait.phase = player.phase
    gait.speedNorm = speedNorm
    gait.move01 = clamp(speed / 0.6, 0, 1)
    // the dip and the absorption replace the stride so legs pose symmetrically
    gait.moving = speed > 0.15 && player.jumpState !== 1 && player.jumpState !== 3 ? 1 : 0
    gait.lift = player.y - surface
    gait.jumpState = player.jumpState
    gait.crouch = player.jumpState === 1 ? player.crouch : 0
    gait.vy = player.vy
    gait.airT = player.airT
    gait.landT = player.landT
    gait.impact = player.impact

    // standing high on what you built opens the horizon — the brand's promise
    if (player.y >= 4) useGame.getState().openVista()

    // --- third-person camera
    const camDist = st.adventure ? ROAM_DISTANCE : CAMERA_DISTANCE
    const camHeight = st.adventure ? ROAM_HEIGHT : CAMERA_HEIGHT
    const horizontal = Math.cos(player.pitch) * camDist
    const eyeY = player.y + camHeight + Math.sin(player.pitch) * camDist
    camera.position.set(
      ORIGIN.x + player.x + Math.sin(player.yaw) * horizontal,
      eyeY,
      ORIGIN.z + player.z + Math.cos(player.yaw) * horizontal,
    )
    camera.lookAt(ORIGIN.x + player.x, player.y + 1.15, ORIGIN.z + player.z)

    // --- build / destroy (challenge mode only; free roam explores, not builds)
    if (st.adventure) {
      input.breakQueued = false
      input.placeQueued = false
    } else if (input.breakQueued || input.placeQueued) {
      const isBreak = input.breakQueued
      input.breakQueued = false
      input.placeQueued = false
      const locked = document.pointerLockElement != null
      _ndc.set(locked ? 0 : input.aimX, locked ? 0 : input.aimY)
      raycaster.setFromCamera(_ndc, camera)
      const targets: THREE.Object3D[] = arenaRefs.blocks
        ? [...arenaRefs.blocks.children]
        : []
      if (arenaRefs.floor) targets.push(arenaRefs.floor)
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
        // stacking intent: clicking a block's side means "carry on top of it",
        // so a tower can be raised from the ground without climbing it first
        if (normal.y === 0 && !occupancyRef.current.has(cellKey({ x: cell.x, y: cell.y + 1, z: cell.z }))) {
          target = { x: cell.x, y: cell.y + 1, z: cell.z }
        }
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

  return null
}
