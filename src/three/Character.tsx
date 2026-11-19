import { useFrame } from '@react-three/fiber'
import type { ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { getPath } from './path'
import {
  atmoMix,
  cadenceFor,
  characterPos,
  characterYaw,
  gait,
  gaitNorm,
  teleport,
  tpBeam,
  tpRing,
  tpScale,
  tpWhoosh,
  TP_DUR,
  TP_VANISH,
} from './shared'
import { ELBOW_SHAPE, KNEE_SHAPE, sampleLoop } from './runLoop'

// Gait parameters follow published biomechanics: walking cadence ~128 spm with
// a 62/38 stance-swing split and ~60° peak swing knee flexion; running cadence
// ~176 spm with ~40/60 stance-swing, ~120° swing knee flexion peaked early in
// swing, an ankle plantarflexion push-off, flight phases and a forward trunk
// lean (Perry & Burnfield 2010; Novacheck 1998; Physio-pedia Running Biomechanics).
// The run knee/elbow flexion SHAPE is retargeted from the Sketchfab reference
// "Male Running (20 frames loop)" by Denys Almaral (see runLoop.ts); amplitudes
// stay calibrated to the character's proportions so the reach() foot-lock holds.
const JOURNEY_SPEED = 3.4 // world m/s of a full-speed checkpoint hop
const JOURNEY_ACCEL = 2.0 // world m/s^2
const TURN_RATE = 9 // rad/s damp when re-facing

// leg measurements in world units, used to keep the stance foot on the ground
// instead of letting the body float mid-stride
const L_THIGH = 0.42
const L_SHIN = 0.422
const ANKLE_TO_SOLE = 0.09
const HIP_HEIGHT = L_THIGH + L_SHIN + ANKLE_TO_SOLE

// Body proportions follow the 7.5-head artistic canon (Richer/Loomis, Wikipedia
// "Body proportions") with Drillis & Contini segment fractions of stature
// (~1.76 m): hip joint 0.53H, shoulder joint 0.81H, elbow 0.62H, wrist 0.48H,
// upper arm 0.186H, forearm 0.146H, hand 0.108H, head 0.13H, foot 0.152H.
const HIP_X = 0.09
const SHOULDER_X = 0.185
const SHOULDER_Y = 0.44 // relative to the torso pivot
const ARM_OUT = 0.09
const L_UPPER = 0.327
const L_FORE = 0.257
const HEAD_Y = 0.6 // head pivot relative to the torso pivot

const TAU = Math.PI * 2
const FRONT = Math.PI / 2
const lerp = THREE.MathUtils.lerp
const clamp = THREE.MathUtils.clamp

/** exponential damp on an angle along the shortest arc */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

export function Character() {
  return (
    <>
      <CharacterDriver />
      <TeleportBeams />
      <ConsultantVisual />
    </>
  )
}

/**
 * Walks the character along the isometric path and publishes its pose for the
 * camera rig and the procedural model. Separate from the visual so the scene
 * does not stall while the model mounts.
 */
function CharacterDriver() {
  const sim = useRef({
    progress: 0,
    velocity: 0,
    phase: 0, // stride phase: advances TAU per full cycle (two steps)
    facing: 1, // +1 walking forward along path, -1 walking back
    yaw: 0,
  })

  const curve = useMemo(() => getPath(), [])
  const pathLength = useMemo(() => curve.getLength(), [curve])
  const maxSpeed = JOURNEY_SPEED / pathLength
  const accel = JOURNEY_ACCEL / pathLength
  const pos = useMemo(() => new THREE.Vector3(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])

  // dev-only ground truth for the QA harnesses (same spirit as __jdebug)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__cdebug = {
      sim: sim.current,
      pathLength,
      maxSpeed,
      accel,
      target: () => useJourney.getState().target,
      at: (t: number) => curve.getPointAt(clamp01(t)).toArray(),
    }
    return () => {
      delete w.__cdebug
    }
  }, [curve, pathLength, maxSpeed, accel])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { target, tick } = useJourney.getState()
    if (useGame.getState().mode === 'game') return
    const s = sim.current

    // --- longitudinal dynamics: desired speed -> acceleration-capped velocity
    const targetP = clamp01(target)
    const jump = targetP - s.progress
    let cut = false
    // a nav link can skip most of the path; walking it would leave the camera
    // seconds behind the already-settled panel, so teleport instead of walking
    if (Math.abs(jump) > 0.16 && teleport.t < 0) {
      teleport.t = 0
      teleport.from.copy(characterPos.current)
      s.progress = targetP
      s.velocity = 0
      curve.getPointAt(clamp01(s.progress), teleport.to)
      cut = true
      audio.teleport()
    }
    const diff = targetP - s.progress
    // sqrt(2·a·d) is the fastest speed that can still brake to a halt exactly
    // at the target; a plain proportional desired speed overshoots checkpoints
    // and makes the character turn around and walk back
    const desired = clamp(
      Math.sign(diff) * Math.min(Math.sqrt(2 * accel * Math.abs(diff)), maxSpeed),
      -maxSpeed,
      maxSpeed,
    )
    const dv = clamp(desired - s.velocity, -accel * dt, accel * dt)
    s.velocity += dv

    // --- path position & facing
    const t = clamp01(s.progress)
    curve.getPointAt(t, pos)
    curve.getTangentAt(t, tan)
    const baseYaw = Math.atan2(tan.x, tan.z)

    if (Math.abs(s.velocity) > 0.01 && Math.sign(s.velocity) !== s.facing) {
      s.facing = Math.sign(s.velocity)
    }
    const targetYaw = baseYaw + (s.facing < 0 ? Math.PI : 0)
    if (cut) s.yaw = targetYaw
    const yawErr = Math.abs(Math.atan2(Math.sin(targetYaw - s.yaw), Math.cos(targetYaw - s.yaw)))
    s.yaw = dampAngle(s.yaw, targetYaw, TURN_RATE, dt)

    // --- teleport sequence: beam out at origin, whoosh, beam in at destination
    if (teleport.t >= 0) {
      teleport.t += dt
      characterPos.current.lerpVectors(teleport.from, teleport.to, tpWhoosh(teleport.t))
      characterYaw.current = s.yaw
      gait.phase = s.phase
      gait.speedNorm = 0
      gait.move01 = 0
      gait.moving = 0
      gait.lift = 0
      gait.jumpState = 0
      gait.crouch = 0
      gait.vy = 0
      gait.airT = 0
      gait.landT = 0
      gait.impact = 0
      if (teleport.t >= TP_DUR) teleport.t = -1
      tick(s.progress)
      return
    }

    // --- turn-in-place: sharply slow translation while the body re-faces
    const turnBrake = yawErr > 0.35 ? clamp(1 - (yawErr - 0.35) / 1.1, 0, 1) : 1
    let step = s.velocity * turnBrake * dt
    // land exactly on the checkpoint: a step that would cross the target is
    // trimmed to it, and the velocity follows so the gait stays grounded
    if (diff === 0) {
      step = 0
      s.velocity = 0
    } else if (Math.sign(step) === Math.sign(diff) && Math.abs(step) > Math.abs(diff)) {
      step = diff
      s.velocity = step / (turnBrake * dt)
    }
    s.progress = clamp01(s.progress + step)

    // cadence follows the actual ground speed, so the stride length matches the
    // distance covered and the feet grip the ground
    const worldSpeed = Math.abs(s.velocity) * pathLength
    const speedNorm = gaitNorm(worldSpeed)
    const cadence = cadenceFor(worldSpeed, speedNorm)
    s.phase += cadence * TAU * dt * Math.max(turnBrake, 0.15)

    characterPos.current.set(pos.x, 0, pos.z)
    characterYaw.current = s.yaw
    gait.phase = s.phase
    gait.speedNorm = speedNorm
    gait.move01 = clamp(worldSpeed / 0.6, 0, 1)
    gait.moving = worldSpeed > 0.05 ? 1 : 0
    gait.lift = 0
    gait.jumpState = 0
    gait.crouch = 0
    gait.vy = 0
    gait.airT = 0
    gait.landT = 0
    gait.impact = 0
    tick(s.progress)
  })

  return null
}

/**
 * Columns of light from the sky for the teleport sequence: one ignites over the
 * origin while the body dematerialises, a second catches it at the destination
 * with a ground shockwave. Normal blending — additive would wash out against
 * the bright dawn sky.
 */
function TeleportBeams() {
  const outerA = useRef<THREE.Mesh>(null)
  const innerA = useRef<THREE.Mesh>(null)
  const outerB = useRef<THREE.Mesh>(null)
  const innerB = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const lightA = useRef<THREE.PointLight>(null)
  const lightB = useRef<THREE.PointLight>(null)

  // shaft origin at its top so scaling Y grows the beam downward from the sky
  const shaft = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.62, 0.5, 14, 24, 1, true)
    geo.translate(0, -7, 0)
    return geo
  }, [])
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.86, 1, 48), [])

  useFrame(() => {
    const t = teleport.t
    const ea = tpBeam(t, false)
    const eb = tpBeam(t, true)
    const u = tpRing(t)
    const beam = (m: THREE.Mesh | null, env: number, x: number, z: number, core: boolean) => {
      if (!m) return
      m.visible = env > 0.002
      m.position.set(x, 14, z)
      m.scale.set(core ? 0.42 : 1, Math.max(env, 0.001), core ? 0.42 : 1)
      ;(m.material as THREE.MeshBasicMaterial).opacity = env * (core ? 0.75 : 0.42)
    }
    beam(outerA.current, ea, teleport.from.x, teleport.from.z, false)
    beam(innerA.current, ea, teleport.from.x, teleport.from.z, true)
    beam(outerB.current, eb, teleport.to.x, teleport.to.z, false)
    beam(innerB.current, eb, teleport.to.x, teleport.to.z, true)
    const lamp = (l: THREE.PointLight | null, env: number, x: number, z: number) => {
      if (!l) return
      l.visible = env > 0.002
      l.position.set(x, 2.2, z)
      l.intensity = env * 26
    }
    lamp(lightA.current, ea, teleport.from.x, teleport.from.z)
    lamp(lightB.current, eb, teleport.to.x, teleport.to.z)
    if (ring.current) {
      ring.current.visible = u > 0 && u < 1
      ring.current.position.set(teleport.to.x, 0.06, teleport.to.z)
      ring.current.scale.setScalar(0.4 + 2.2 * u)
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.6
    }
  })

  return (
    <>
      <mesh ref={outerA} geometry={shaft} visible={false} frustumCulled={false}>
        <meshBasicMaterial color="#f2a13c" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={innerA} geometry={shaft} visible={false} frustumCulled={false}>
        <meshBasicMaterial color="#fff7e6" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={outerB} geometry={shaft} visible={false} frustumCulled={false}>
        <meshBasicMaterial color="#f2a13c" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={innerB} geometry={shaft} visible={false} frustumCulled={false}>
        <meshBasicMaterial color="#fff7e6" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring} geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <meshBasicMaterial color="#f2a13c" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight ref={lightA} color="#ffd9a0" distance={14} decay={2} intensity={0} visible={false} />
      <pointLight ref={lightB} color="#ffd9a0" distance={14} decay={2} intensity={0} visible={false} />
    </>
  )
}

/**
 * Sagittal joint targets over one normalised cycle (u = 0 at heel strike),
 * flexion positive, walk and run parameter sets blended by speedNorm.
 * Stance: hip extends linearly, knee absorbs then re-extends. Swing: knee
 * flexes to its peak early (heel toward the butt) then extends before contact;
 * the hip drives forward. `ankle` is the WORLD foot angle (toes-down positive):
 * slightly toes-up at contact, flat through mid-stance, plantarflexed push-off,
 * dorsiflexed clearance in swing — the foot group cancels the shin tilt.
 */
function jointAt(u: number, sn: number) {
  const stanceFrac = lerp(0.62, 0.4, sn)
  const hipIC = lerp(0.52, 0.7, sn)
  const hipTO = lerp(-0.17, -0.35, sn)
  const hipDrive = lerp(0.1, 0.78, sn)
  const kneeIC = lerp(0.09, 0.26, sn)
  const kneeMid = lerp(0.26, 0.78, sn)
  const kneeTO = lerp(0.62, 0.3, sn)
  const kneeSwing = lerp(1.05, 2.09, sn)
  const ankIC = lerp(-0.12, -0.06, sn)
  const ankTO = lerp(0.32, 0.5, sn)
  const ankClear = lerp(0.12, 0.2, sn)
  // authentic run knee shape from the Sketchfab reference loop, mapped onto
  // the character's run range (0.26 rad extended → 2.09 rad swing fold);
  // blended in by speed so walking keeps the analytic curve
  const kneeRef = 0.26 + sampleLoop(KNEE_SHAPE, u) * (2.09 - 0.26)
  if (u < stanceFrac) {
    const s = u / stanceFrac
    const hip = lerp(hipIC, hipTO, s)
    const kneeBase =
      lerp(kneeIC, kneeTO, s) +
      (kneeMid - lerp(kneeIC, kneeTO, 0.4)) * Math.pow(Math.sin(Math.PI * s), 1.1)
    // the sole stays flat until late stance, then rolls onto the toe
    const ankle = lerp(ankIC, ankTO, Math.pow(s, 1.7))
    return { hip, knee: lerp(kneeBase, kneeRef, sn), ankle }
  }
  const s = (u - stanceFrac) / (1 - stanceFrac)
  const hip =
    lerp(hipTO, hipIC, s) + hipDrive * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.85)), 1.1)
  const kneeBase =
    lerp(kneeTO, kneeIC, s) +
    (kneeSwing - lerp(kneeTO, kneeIC, 0.35)) * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.65)), 0.9)
  const ankle = lerp(ankTO, ankIC, s) - ankClear * Math.sin(Math.PI * s)
  return { hip, knee: lerp(kneeBase, kneeRef, sn), ankle }
}

function useBlobShadow() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const grd = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    grd.addColorStop(0, 'rgba(16,20,24,0.5)')
    grd.addColorStop(0.55, 'rgba(16,20,24,0.2)')
    grd.addColorStop(1, 'rgba(16,20,24,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

// --- lofted low-poly body ---------------------------------------------------
// Rings are stacked along +Y (or +Z for shoes). A ring is a superellipse-ish
// cross section: x = cx + rx*cos(theta), z = cz + r*sin(theta) with a separate
// back radius, so torsos, limbs and heads get a chest/back and calf bulge
// without any texture work. Caps are triangle fans, normals smoothed.
type Ring = { y: number; rx: number; rz: number; rb?: number; x?: number; z?: number }

function loftY(rings: Ring[], seg = 12, capStart = true, capEnd = true) {
  const rows = rings.length
  const pos: number[] = []
  const idx: number[] = []
  for (const r of rings) {
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * TAU
      const s = Math.sin(th)
      const rr = s >= 0 ? r.rz : (r.rb ?? r.rz)
      pos.push((r.x ?? 0) + r.rx * Math.cos(th), r.y, (r.z ?? 0) + rr * s)
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg
      const a = i * seg + j
      const b = i * seg + j2
      const c = (i + 1) * seg + j
      const d = (i + 1) * seg + j2
      idx.push(a, c, d, a, d, b)
    }
  }
  if (capStart) {
    const c = pos.length / 3
    pos.push(rings[0].x ?? 0, rings[0].y, rings[0].z ?? 0)
    for (let j = 0; j < seg; j++) idx.push(c, j, (j + 1) % seg)
  }
  if (capEnd) {
    const c = pos.length / 3
    const r = rows - 1
    pos.push(rings[r].x ?? 0, rings[r].y, rings[r].z ?? 0)
    for (let j = 0; j < seg; j++) idx.push(c, r * seg + ((j + 1) % seg), r * seg + j)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** open curved strip along the front of a lofted torso (shirt, lapels) */
type PatchRing = Ring & { a0: number; a1: number }

function patchY(rings: PatchRing[], seg = 8) {
  const rows = rings.length
  const stride = seg + 1
  const pos: number[] = []
  const idx: number[] = []
  for (const r of rings) {
    for (let j = 0; j <= seg; j++) {
      const th = r.a0 + ((r.a1 - r.a0) * j) / seg
      const s = Math.sin(th)
      const rr = s >= 0 ? r.rz : (r.rb ?? r.rz)
      pos.push((r.x ?? 0) + r.rx * Math.cos(th), r.y, (r.z ?? 0) + rr * s)
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * stride + j
      const b = a + 1
      const c = (i + 1) * stride + j
      const d = c + 1
      idx.push(a, c, d, a, d, b)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

type ShoeRing = { z: number; rx: number; ry: number; cx?: number; cy?: number }

function loftZ(rings: ShoeRing[], seg = 10) {
  const rows = rings.length
  const pos: number[] = []
  const idx: number[] = []
  for (const r of rings) {
    for (let j = 0; j < seg; j++) {
      const th = (j / seg) * TAU
      pos.push((r.cx ?? 0) + r.rx * Math.cos(th), (r.cy ?? 0) + r.ry * Math.sin(th), r.z)
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const j2 = (j + 1) % seg
      const a = i * seg + j
      const b = i * seg + j2
      const c = (i + 1) * seg + j
      const d = (i + 1) * seg + j2
      idx.push(a, b, d, a, d, c)
    }
  }
  const back = pos.length / 3
  pos.push(rings[0].cx ?? 0, rings[0].cy ?? 0, rings[0].z)
  for (let j = 0; j < seg; j++) idx.push(back, (j + 1) % seg, j)
  const front = pos.length / 3
  const r = rows - 1
  pos.push(rings[r].cx ?? 0, rings[r].cy ?? 0, rings[r].z)
  for (let j = 0; j < seg; j++) idx.push(front, r * seg + j, r * seg + ((j + 1) % seg))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const sphere = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h)

function buildConsultantGeometry() {
  const pelvis = loftY(
    [
      { y: 0.06, rx: 0.148, rz: 0.105, rb: 0.1 },
      { y: 0.02, rx: 0.156, rz: 0.114, rb: 0.112 },
      { y: -0.025, rx: 0.154, rz: 0.112, rb: 0.116 },
      { y: -0.07, rx: 0.14, rz: 0.104, rb: 0.11 },
      { y: -0.1, rx: 0.116, rz: 0.088, rb: 0.092 },
      { y: -0.118, rx: 0.082, rz: 0.066, rb: 0.07 },
    ],
    14,
  )

  const thigh = loftY(
    [
      { y: 0.075, rx: 0.082, rz: 0.088, rb: 0.086 },
      { y: 0.01, rx: 0.089, rz: 0.095, rb: 0.092 },
      { y: -0.1, rx: 0.081, rz: 0.086, rb: 0.084 },
      { y: -0.22, rx: 0.07, rz: 0.074, rb: 0.072 },
      { y: -0.33, rx: 0.061, rz: 0.064, rb: 0.063 },
      { y: -0.42, rx: 0.057, rz: 0.059, rb: 0.058 },
    ],
    12,
  )

  const knee = sphere(0.056, 8, 6)

  const shin = loftY(
    [
      { y: 0.015, rx: 0.055, rz: 0.058, rb: 0.056 },
      { y: -0.07, rx: 0.058, rz: 0.058, rb: 0.072 },
      { y: -0.16, rx: 0.052, rz: 0.052, rb: 0.062 },
      { y: -0.28, rx: 0.044, rz: 0.046, rb: 0.046 },
      { y: -0.38, rx: 0.05, rz: 0.052, rb: 0.05 },
      { y: -0.422, rx: 0.048, rz: 0.05, rb: 0.048 },
    ],
    12,
  )

  // dress shoe, sole resting on y = -ANKLE_TO_SOLE; ~0.27 m long
  const shoe = loftZ(
    [
      { z: -0.072, rx: 0.03, ry: 0.032, cy: -0.058 },
      { z: -0.045, rx: 0.042, ry: 0.038, cy: -0.052 },
      { z: -0.005, rx: 0.048, ry: 0.042, cy: -0.048 },
      { z: 0.045, rx: 0.049, ry: 0.036, cy: -0.054 },
      { z: 0.105, rx: 0.047, ry: 0.03, cy: -0.06 },
      { z: 0.155, rx: 0.041, ry: 0.024, cy: -0.066 },
      { z: 0.192, rx: 0.029, ry: 0.016, cy: -0.074 },
    ],
    10,
  )

  const sole = loftZ(
    [
      { z: -0.068, rx: 0.032, ry: 0.008, cy: -0.082 },
      { z: -0.04, rx: 0.044, ry: 0.008, cy: -0.082 },
      { z: 0.0, rx: 0.051, ry: 0.008, cy: -0.082 },
      { z: 0.05, rx: 0.052, ry: 0.008, cy: -0.082 },
      { z: 0.11, rx: 0.05, ry: 0.008, cy: -0.082 },
      { z: 0.16, rx: 0.044, ry: 0.008, cy: -0.082 },
      { z: 0.196, rx: 0.032, ry: 0.008, cy: -0.082 },
    ],
    10,
  )

  const upperArm = loftY(
    [
      { y: 0.02, rx: 0.03, rz: 0.032 },
      { y: 0.005, rx: 0.048, rz: 0.05 },
      { y: -0.015, rx: 0.058, rz: 0.06 },
      { y: -0.09, rx: 0.052, rz: 0.054 },
      { y: -0.18, rx: 0.047, rz: 0.049 },
      { y: -0.27, rx: 0.043, rz: 0.045 },
      { y: -0.327, rx: 0.04, rz: 0.042 },
    ],
    12,
  )

  const elbow = sphere(0.044, 8, 6)

  const forearm = loftY(
    [
      { y: 0.02, rx: 0.041, rz: 0.043 },
      { y: -0.06, rx: 0.042, rz: 0.044 },
      { y: -0.15, rx: 0.036, rz: 0.038 },
      { y: -0.225, rx: 0.03, rz: 0.032 },
    ],
    10,
  )

  const cuff = new THREE.CylinderGeometry(0.031, 0.032, 0.03, 10, 1, true)

  const hand = loftY(
    [
      { y: 0.028, rx: 0.027, rz: 0.018 },
      { y: 0.0, rx: 0.031, rz: 0.019 },
      { y: -0.045, rx: 0.037, rz: 0.02 },
      { y: -0.085, rx: 0.038, rz: 0.019 },
      { y: -0.105, rx: 0.036, rz: 0.017, z: 0.002 },
      { y: -0.135, rx: 0.034, rz: 0.015, z: 0.006 },
      { y: -0.165, rx: 0.029, rz: 0.012, z: 0.01 },
      { y: -0.178, rx: 0.016, rz: 0.008, z: 0.012 },
    ],
    10,
  )

  const thumb = new THREE.CapsuleGeometry(0.0105, 0.036, 3, 6)

  const torso = loftY(
    [
      { y: -0.045, rx: 0.16, rz: 0.118, rb: 0.114 },
      { y: 0.01, rx: 0.158, rz: 0.116, rb: 0.112 },
      { y: 0.08, rx: 0.161, rz: 0.121, rb: 0.112 },
      { y: 0.16, rx: 0.168, rz: 0.126, rb: 0.115 },
      { y: 0.24, rx: 0.173, rz: 0.128, rb: 0.118 },
      { y: 0.32, rx: 0.175, rz: 0.125, rb: 0.119 },
      { y: 0.39, rx: 0.172, rz: 0.117, rb: 0.117 },
      { y: 0.425, rx: 0.171, rz: 0.11, rb: 0.114 },
      { y: 0.45, rx: 0.168, rz: 0.1, rb: 0.108 },
      { y: 0.465, rx: 0.15, rz: 0.09, rb: 0.098 },
      { y: 0.478, rx: 0.11, rz: 0.078, rb: 0.086 },
      { y: 0.49, rx: 0.068, rz: 0.062, rb: 0.066 },
    ],
    16,
  )

  const shirt = patchY(
    [
      { y: 0.06, rx: 0.164, rz: 0.123, rb: 0.117, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.16, rx: 0.172, rz: 0.13, rb: 0.119, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.24, rx: 0.177, rz: 0.132, rb: 0.122, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.32, rx: 0.179, rz: 0.129, rb: 0.123, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.39, rx: 0.176, rz: 0.121, rb: 0.121, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.425, rx: 0.172, rz: 0.114, rb: 0.118, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.448, rx: 0.15, rz: 0.104, rb: 0.108, a0: FRONT - 0.64, a1: FRONT + 0.64 },
      { y: 0.465, rx: 0.142, rz: 0.095, rb: 0.102, a0: FRONT - 0.52, a1: FRONT + 0.52 },
      { y: 0.488, rx: 0.1, rz: 0.068, rb: 0.074, a0: FRONT - 0.38, a1: FRONT + 0.38 },
    ],
    10,
  )

  const lapel = (side: 1 | -1) => {
    const rows: [number, number, number, number, number][] = [
      [0.055, 0.168, 0.126, 0.122, 0.055],
      [0.15, 0.176, 0.134, 0.123, 0.12],
      [0.24, 0.181, 0.136, 0.126, 0.18],
      [0.33, 0.183, 0.133, 0.127, 0.23],
      [0.41, 0.18, 0.121, 0.125, 0.265],
      [0.448, 0.158, 0.108, 0.116, 0.285],
    ]
    return patchY(
      rows.map(([y, rx, rz, rb, inner]) => ({
        y,
        rx,
        rz,
        rb,
        a0: FRONT + (side > 0 ? inner : -0.63),
        a1: FRONT + (side > 0 ? 0.63 : -inner),
      })),
      6,
    )
  }

  const tie = loftY(
    [
      { y: 0.155, rx: 0.008, rz: 0.005, z: 0.135 },
      { y: 0.18, rx: 0.03, rz: 0.006, z: 0.135 },
      { y: 0.28, rx: 0.026, rz: 0.006, z: 0.133 },
      { y: 0.36, rx: 0.021, rz: 0.006, z: 0.128 },
      { y: 0.42, rx: 0.017, rz: 0.006, z: 0.119 },
      { y: 0.438, rx: 0.02, rz: 0.011, z: 0.111 },
      { y: 0.458, rx: 0.018, rz: 0.012, z: 0.105 },
    ],
    8,
  )

  const collar = patchY(
    [
      { y: 0.44, rx: 0.09, rz: 0.082, rb: 0.076, a0: FRONT + 0.8, a1: FRONT + TAU - 0.8 },
      { y: 0.48, rx: 0.083, rz: 0.074, rb: 0.07, a0: FRONT + 0.8, a1: FRONT + TAU - 0.8 },
      { y: 0.515, rx: 0.075, rz: 0.066, rb: 0.064, a0: FRONT + 0.8, a1: FRONT + TAU - 0.8 },
    ],
    16,
  )

  const shirtCollar = loftY(
    [
      { y: 0.505, rx: 0.064, rz: 0.058, rb: 0.058 },
      { y: 0.532, rx: 0.058, rz: 0.054, rb: 0.054 },
    ],
    12,
    false,
    false,
  )

  const neck = loftY(
    [
      { y: 0.0, rx: 0.062, rz: 0.058, rb: 0.058 },
      { y: 0.06, rx: 0.055, rz: 0.052, rb: 0.052 },
      { y: 0.13, rx: 0.049, rz: 0.048, rb: 0.052 },
      { y: 0.155, rx: 0.046, rz: 0.046, rb: 0.05 },
    ],
    10,
  )

  const head = loftY(
    [
      { y: -0.031, rx: 0.021, rz: 0.028, rb: 0.02, z: 0.014 },
      { y: -0.012, rx: 0.046, rz: 0.064, rb: 0.04, z: 0.012 },
      { y: 0.018, rx: 0.064, rz: 0.084, rb: 0.058, z: 0.008 },
      { y: 0.05, rx: 0.073, rz: 0.09, rb: 0.07, z: 0.004 },
      { y: 0.083, rx: 0.077, rz: 0.092, rb: 0.076, z: 0.002 },
      { y: 0.115, rx: 0.076, rz: 0.087, rb: 0.08 },
      { y: 0.15, rx: 0.07, rz: 0.077, rb: 0.076, z: -0.002 },
      { y: 0.18, rx: 0.053, rz: 0.057, rb: 0.061, z: -0.004 },
      { y: 0.198, rx: 0.021, rz: 0.022, rb: 0.026, z: -0.004 },
    ],
    16,
  )

  const hair = loftY(
    [
      { y: 0.118, rx: 0.08, rz: 0.091, rb: 0.082 },
      { y: 0.15, rx: 0.075, rz: 0.082, rb: 0.081 },
      { y: 0.18, rx: 0.058, rz: 0.061, rb: 0.066 },
      { y: 0.196, rx: 0.035, rz: 0.035, rb: 0.04 },
      { y: 0.202, rx: 0.012, rz: 0.012, rb: 0.015 },
    ],
    12,
  )

  const hairBack = sphere(0.075, 10, 8)

  const ear = sphere(0.032, 7, 6)
  const eye = sphere(0.012, 8, 6)
  const pupil = sphere(0.0055, 6, 5)

  const nose = loftY(
    [
      { y: 0.024, rx: 0.016, rz: 0.01, z: 0.098 },
      { y: 0.042, rx: 0.013, rz: 0.011, z: 0.096 },
      { y: 0.06, rx: 0.009, rz: 0.008, z: 0.092 },
      { y: 0.078, rx: 0.007, rz: 0.006, z: 0.089 },
    ],
    8,
  )

  const lens = new THREE.TorusGeometry(0.027, 0.0032, 4, 14)
  const button = sphere(0.009, 6, 5)

  return {
    pelvis,
    thigh,
    knee,
    shin,
    shoe,
    sole,
    upperArm,
    elbow,
    forearm,
    cuff,
    hand,
    thumb,
    torso,
    shirt,
    lapelR: lapel(1),
    lapelL: lapel(-1),
    tie,
    collar,
    shirtCollar,
    neck,
    head,
    hair,
    hairBack,
    ear,
    eye,
    pupil,
    nose,
    lens,
    button,
  }
}

type ConsultantGeo = ReturnType<typeof buildConsultantGeometry>

function useConsultantMaterials() {
  const mats = useMemo(() => {
    const make = (color: string, roughness = 0.78, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true })
    return {
      jacket: make('#203044', 0.84),
      jacketDark: make('#182435', 0.86),
      trousers: make('#2b3a4e', 0.88),
      shirt: make('#eef3f8', 0.62),
      tie: make('#dd8a2b', 0.58),
      skin: make('#c98e6b', 0.76),
      hair: make('#2a211c', 0.92),
      shoe: make('#151b23', 0.5, 0.08),
      belt: make('#0f151d', 0.55),
      glasses: make('#111827', 0.32, 0.35),
      eye: make('#f5f2ea', 0.4),
      pupil: make('#20201e', 0.35),
      mouth: make('#80514a', 0.7),
      badge: make('#f8fafc', 0.5),
      badgeAccent: make('#dd8a2b', 0.52),
      metal: make('#9aa4b2', 0.35, 0.6),
    }
  }, [])

  return mats
}

type ConsultantMats = ReturnType<typeof useConsultantMaterials>

/**
 * Night-only neon silhouette, the same trick as the old rigged character: every
 * garment part renders an inflated back-face copy that writes no depth, so only
 * the halo outside the body survives. Surface colours are never touched.
 */
function useNeonOutline() {
  return useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffcf6e',
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        'vec3 transformed = vec3( position ) + normal * 0.014;',
      )
    }
    return mat
  }, [])
}

type MeshProps = ThreeElements['mesh']

function Part({
  g,
  m,
  outline,
  ...rest
}: MeshProps & { g: THREE.BufferGeometry; m: THREE.Material; outline?: THREE.Material }) {
  return (
    <mesh geometry={g} material={m} {...rest}>
      {outline ? <mesh geometry={g} material={outline} visible={false} /> : null}
    </mesh>
  )
}

function Hand({
  side,
  mats,
  outline,
  geo,
}: {
  side: -1 | 1
  mats: ConsultantMats
  outline: THREE.Material
  geo: ConsultantGeo
}) {
  return (
    <>
      <Part g={geo.hand} m={mats.skin} outline={outline} />
      <mesh
        geometry={geo.thumb}
        material={mats.skin}
        position={[-side * 0.03, -0.042, 0.014]}
        rotation={[-0.3, 0, -side * 0.45]}
      />
    </>
  )
}

function ConsultantVisual() {
  const mats = useConsultantMaterials()
  const hull = useNeonOutline()
  const geo = useMemo(buildConsultantGeometry, [])
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const hipL = useRef<THREE.Group>(null)
  const hipR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  const footL = useRef<THREE.Group>(null)
  const footR = useRef<THREE.Group>(null)
  const shoulderL = useRef<THREE.Group>(null)
  const shoulderR = useRef<THREE.Group>(null)
  const elbowL = useRef<THREE.Group>(null)
  const elbowR = useRef<THREE.Group>(null)
  const handL = useRef<THREE.Group>(null)
  const handR = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const hullOn = useRef(false)
  const blob = useBlobShadow()
  const jumpPose = useRef({ hip: 0, knee: 0, foot: 0, arm: 0, elbow: 0, spine: 0, neck: 0, w: 0 })
  const pov = useJourney((s) => s.pov)
  const mode = useGame((s) => s.mode)

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const { phase, speedNorm, move01, moving, lift } = gait

    // amplitude fades out quickly when coming to a standstill; it must track
    // real ground speed, not the walk↔run blend (a pure walk has speedNorm 0)
    const walkBlend = move01
    const stanceFrac = lerp(0.62, 0.4, speedNorm)

    // each leg gets its own cycle position; the right leg is half a cycle behind
    const uL = (((phase / TAU) % 1) + 1) % 1
    const uR = (uL + 0.5) % 1

    const jL = jointAt(uL, speedNorm)
    const jR = jointAt(uR, speedNorm)
    // positive rotation about X swings a hanging limb backward (-Z)
    const hipFLeg = -jL.hip * walkBlend
    const hipRLeg = -jR.hip * walkBlend
    const kneeFLeg = jL.knee * walkBlend
    const kneeRLeg = jR.knee * walkBlend
    const ankleL = jL.ankle * walkBlend
    const ankleR = jR.ankle * walkBlend

    // arms counter-swing the legs about a CENTRED shoulder range (the raw hip
    // curve is asymmetric): walking ±15°, running ±35° so the hand travels
    // hip-pocket → chin instead of hovering in front of the chest. The elbow
    // closes front-side and opens back-side as the shoulder extends.
    const hipMean = lerp(0.17, 0.21, speedNorm)
    const armGain = lerp(0.75, 1.08, speedNorm) * walkBlend
    const idle = Math.sin(t * 1.7) * 0.02 * (1 - moving)
    const armSwingL = (jL.hip - hipMean) * armGain + idle
    const armSwingR = (jR.hip - hipMean) * armGain + idle
    const elbowBase = lerp(0.35, 1.57, speedNorm * speedNorm)
    const elbowOsc = lerp(0.12, 0.75, speedNorm) * walkBlend
    const elbowFlexL = elbowBase + (0.5 - sampleLoop(ELBOW_SHAPE, uL)) * elbowOsc
    const elbowFlexR = elbowBase + (0.5 - sampleLoop(ELBOW_SHAPE, uR)) * elbowOsc
    const wristL = -0.15 * speedNorm * walkBlend * (armSwingL / 0.61)
    const wristR = -0.15 * speedNorm * walkBlend * (armSwingR / 0.61)
    const lean = (speedNorm * speedNorm * 0.22 + speedNorm * 0.04) * walkBlend
    const abduct = ARM_OUT + speedNorm * 0.04

    // --- countermovement jump pose blended over the stride: braking dip with
    // arms swept back, extension + tuck with arms overhead on the rise, reach
    // for the ground on the fall, then knee/hip absorption on touch-down
    const jp = jumpPose.current
    const js = gait.jumpState
    let tHip = 0
    let tKnee = 0
    let tFoot = 0
    let tArm = 0
    let tElbow = 0
    let tSpine = 0
    let tNeck = 0
    let tW = 0
    if (js === 1) {
      const c = gait.crouch
      tHip = -0.85 * c
      tKnee = 1.45 * c
      tFoot = -(tHip + tKnee) * 0.9
      tArm = 0.8 * c
      tElbow = 0.5 * c
      tSpine = 0.42 * c
      tNeck = -0.3 * c
      tW = c
    } else if (js === 2) {
      tW = 1
      if (gait.vy > 0) {
        const up = clamp(gait.airT / 0.22, 0, 1)
        tHip = lerp(-0.15, -0.6, up)
        tKnee = lerp(0.2, 1.2, up)
        tFoot = -(tHip + tKnee) * 0.45
        tArm = lerp(0.8, -2.35, up)
        tElbow = lerp(0.5, 0.25, up)
        tSpine = 0.1
        tNeck = -0.08
      } else {
        tHip = -0.42
        tKnee = 0.8
        tFoot = -(tHip + tKnee) * 0.8
        tArm = -0.95
        tElbow = 0.55
        tSpine = 0.22
        tNeck = -0.16
      }
    } else if (js === 3) {
      const l = (1 - clamp(gait.landT / 0.3, 0, 1)) * (0.5 + 0.5 * gait.impact)
      tHip = -0.95 * l
      tKnee = 1.6 * l
      tFoot = -(tHip + tKnee) * 0.9
      tArm = -0.7 * l
      tElbow = 0.6 * l
      tSpine = 0.45 * l
      tNeck = -0.32 * l
      tW = l
    }
    const k = 1 - Math.exp(-16 * dt)
    const kw = 1 - Math.exp(-12 * dt)
    jp.hip += (tHip - jp.hip) * k
    jp.knee += (tKnee - jp.knee) * k
    jp.foot += (tFoot - jp.foot) * k
    jp.arm += (tArm - jp.arm) * k
    jp.elbow += (tElbow - jp.elbow) * k
    jp.spine += (tSpine - jp.spine) * k
    jp.neck += (tNeck - jp.neck) * k
    jp.w += (tW - jp.w) * kw
    const w = jp.w

    const hipF = lerp(hipFLeg, jp.hip, w)
    const hipRr = lerp(hipRLeg, jp.hip, w)
    const kneeF = lerp(kneeFLeg, jp.knee, w)
    const kneeRr = lerp(kneeRLeg, jp.knee, w)
    const footF = lerp(-(hipFLeg + kneeFLeg) + ankleL, jp.foot, w)
    const footRr = lerp(-(hipRLeg + kneeRLeg) + ankleR, jp.foot, w)
    const armF = lerp(armSwingL, jp.arm, w)
    const armRr = lerp(armSwingR, jp.arm, w)
    const elbowF = lerp(elbowFlexL, jp.elbow, w)
    const elbowRr = lerp(elbowFlexR, jp.elbow, w)
    const leanF = lerp(lean, jp.spine, w)
    const neckF = lerp(-lean * 0.75, jp.neck, w)

    if (hipL.current) hipL.current.rotation.x = hipF
    if (hipR.current) hipR.current.rotation.x = hipRr
    if (kneeL.current) kneeL.current.rotation.x = kneeF
    if (kneeR.current) kneeR.current.rotation.x = kneeRr
    // ankle keeps the sole roughly level with the ground
    if (footL.current) footL.current.rotation.x = footF
    if (footR.current) footR.current.rotation.x = footRr

    if (shoulderL.current) shoulderL.current.rotation.set(armF, 0, -abduct)
    if (shoulderR.current) shoulderR.current.rotation.set(armRr, 0, abduct)
    if (elbowL.current) elbowL.current.rotation.x = -elbowF
    if (elbowR.current) elbowR.current.rotation.x = -elbowRr
    if (handL.current) handL.current.rotation.x = wristL
    if (handR.current) handR.current.rotation.x = wristR

    if (torso.current) {
      torso.current.rotation.x = leanF
      torso.current.rotation.z = Math.sin(phase) * 0.018 * walkBlend
      // idle breathing lifts the chest a few millimetres, never the whole body
      torso.current.position.y = 0.03 + Math.sin(t * 1.9) * 0.004 * (1 - moving)
    }
    if (head.current) {
      head.current.rotation.x = neckF
      head.current.rotation.y = Math.sin(t * 0.37) * 0.06 * (1 - moving)
      head.current.rotation.z = -Math.sin(phase) * 0.015 * walkBlend
    }

    // drop the pelvis just enough that the stance foot rests on the ground;
    // during flight both feet are tucked, so the body flies
    const reach = (hip: number, knee: number) =>
      L_THIGH * Math.cos(hip) + L_SHIN * Math.cos(hip + knee)
    const stanceL = uL < stanceFrac
    const stanceR = uR < stanceFrac
    // flight apex between toe-off and the next contact. The arc starts and ends
    // at the exact support heights of the neighbouring stance phases, so the
    // body hops instead of teleporting vertically at each boundary.
    const q = uL % 0.5
    const flightProg = q >= stanceFrac ? (q - stanceFrac) / (0.5 - stanceFrac) : -1
    const jTO = jointAt(stanceFrac - 1e-4, speedNorm)
    const jIC = jointAt(0, speedNorm)
    const support =
      js === 2
        ? HIP_HEIGHT - ANKLE_TO_SOLE
        : js === 1 || js === 3
          ? reach(hipF, kneeF)
          : flightProg >= 0
            ? lerp(
                reach(-jTO.hip * walkBlend, jTO.knee * walkBlend),
                reach(-jIC.hip * walkBlend, jIC.knee * walkBlend),
                flightProg,
              ) + Math.sin(Math.PI * flightProg) * lerp(0, 0.06, speedNorm) * walkBlend
            : Math.max(
                stanceL ? reach(hipF, kneeF) : -Infinity,
                stanceR ? reach(hipRr, kneeRr) : -Infinity,
              )
    const soleGap = HIP_HEIGHT - ANKLE_TO_SOLE - support
    const bodyY = -soleGap + lift
    const baseY = characterPos.current.y

    g.position.set(characterPos.current.x, baseY + bodyY, characterPos.current.z)
    g.rotation.y = characterYaw.current
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__consultantDebug = { g }
    }

    // teleport: dematerialise shrink + rise + spin, hidden during the whoosh,
    // easeOutBack rematerialise at the destination beam
    const ts = tpScale(teleport.t)
    if (teleport.t >= 0) {
      const hidden = 1 - clamp(ts, 0, 1)
      g.position.y += hidden * 0.4
      if (teleport.t < TP_VANISH) g.rotation.y += hidden * 3
    }
    g.scale.setScalar(Math.max(ts, 0.0001))
    g.visible = (mode === 'game' || pov !== 'fp') && ts > 0.02

    if (shadow.current) {
      const fade = clamp(1 - lift / 1.6, 0.25, 1)
      const landPulse = js === 3 ? (1 - clamp(gait.landT / 0.3, 0, 1)) * 0.3 * gait.impact : 0
      // the path ribbon's top face sits at y≈0.033, so the shadow has to clear
      // it or it disappears underneath
      shadow.current.position.set(characterPos.current.x, baseY + 0.045, characterPos.current.z)
      shadow.current.scale.setScalar((1 + lift * 0.35 + landPulse) * Math.max(ts, 0.0001))
      ;(shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * fade * clamp(ts, 0, 1)
    }

    // neon silhouette wakes up with the night atmosphere; the suit itself keeps
    // exactly its daylight colours at every hour
    const n = atmoMix.night
    hull.opacity = 0.95 * n
    const glow = n > 0.02
    if (glow !== hullOn.current) {
      hullOn.current = glow
      g.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh && m.material === hull) m.visible = glow
      })
    }
  })

  return (
    <>
      <group ref={root} visible={mode === 'game' || pov !== 'fp'}>
        <group ref={body} position={[0, HIP_HEIGHT, 0]}>
          {/* trouser seat */}
          <Part g={geo.pelvis} m={mats.trousers} outline={hull} />

          {/* legs */}
          <group ref={hipL} position={[-HIP_X, 0, 0]}>
            <Part g={geo.thigh} m={mats.trousers} outline={hull} />
            <group ref={kneeL} position={[0, -L_THIGH, 0]}>
              <Part g={geo.knee} m={mats.trousers} outline={hull} />
              <Part g={geo.shin} m={mats.trousers} outline={hull} />
              <group ref={footL} position={[0, -L_SHIN, 0]}>
                <Part g={geo.shoe} m={mats.shoe} outline={hull} />
                <Part g={geo.sole} m={mats.belt} />
              </group>
            </group>
          </group>
          <group ref={hipR} position={[HIP_X, 0, 0]}>
            <Part g={geo.thigh} m={mats.trousers} outline={hull} />
            <group ref={kneeR} position={[0, -L_THIGH, 0]}>
              <Part g={geo.knee} m={mats.trousers} outline={hull} />
              <Part g={geo.shin} m={mats.trousers} outline={hull} />
              <group ref={footR} position={[0, -L_SHIN, 0]}>
                <Part g={geo.shoe} m={mats.shoe} outline={hull} />
                <Part g={geo.sole} m={mats.belt} />
              </group>
            </group>
          </group>

          {/* torso: jacket shell, shirt bib, lapels, tie, collar, badge */}
          <group ref={torso} position={[0, 0.03, 0]}>
            <Part g={geo.torso} m={mats.jacket} outline={hull} />
            <mesh geometry={geo.shirt} material={mats.shirt} />
            <mesh geometry={geo.lapelR} material={mats.jacketDark} />
            <mesh geometry={geo.lapelL} material={mats.jacketDark} />
            <mesh geometry={geo.tie} material={mats.tie} />
            <mesh geometry={geo.collar} material={mats.jacketDark} />
            <mesh geometry={geo.shirtCollar} material={mats.shirt} />
            <mesh geometry={geo.button} material={mats.metal} position={[0, 0.062, 0.129]} />

            <mesh
              material={mats.badge}
              position={[-0.078, 0.275, 0.1255]}
              rotation={[0, -0.43, 0]}
            >
              <boxGeometry args={[0.05, 0.068, 0.008]} />
            </mesh>
            <mesh
              material={mats.badgeAccent}
              position={[-0.081, 0.298, 0.1285]}
              rotation={[0, -0.43, 0]}
            >
              <boxGeometry args={[0.05, 0.012, 0.003]} />
            </mesh>
            <mesh
              material={mats.metal}
              position={[-0.083, 0.238, 0.128]}
              rotation={[0, -0.43, 0]}
            >
              <boxGeometry args={[0.014, 0.009, 0.003]} />
            </mesh>
            <mesh
              material={mats.jacketDark}
              position={[0.105, 0.095, 0.095]}
              rotation={[0, 0.705, 0]}
            >
              <boxGeometry args={[0.055, 0.011, 0.011]} />
            </mesh>
            <mesh
              material={mats.jacketDark}
              position={[-0.105, 0.095, 0.095]}
              rotation={[0, -0.705, 0]}
            >
              <boxGeometry args={[0.055, 0.011, 0.011]} />
            </mesh>

            {/* neck + head */}
            <Part g={geo.neck} m={mats.skin} position={[0, 0.43, 0]} />
            <group ref={head} position={[0, HEAD_Y, 0]}>
              <Part g={geo.head} m={mats.skin} outline={hull} />
              <Part g={geo.hair} m={mats.hair} outline={hull} />
              <Part
                g={geo.hairBack}
                m={mats.hair}
                outline={hull}
                position={[0, 0.078, -0.036]}
                scale={[0.98, 1.02, 0.74]}
              />
              <mesh
                geometry={geo.ear}
                material={mats.skin}
                position={[-0.077, 0.066, -0.004]}
                scale={[0.45, 1, 0.72]}
              />
              <mesh
                geometry={geo.ear}
                material={mats.skin}
                position={[0.077, 0.066, -0.004]}
                scale={[0.45, 1, 0.72]}
              />

              <mesh
                geometry={geo.eye}
                material={mats.eye}
                position={[-0.0315, 0.0835, 0.0855]}
                scale={[1, 0.85, 0.7]}
              />
              <mesh
                geometry={geo.eye}
                material={mats.eye}
                position={[0.0315, 0.0835, 0.0855]}
                scale={[1, 0.85, 0.7]}
              />
              <mesh geometry={geo.pupil} material={mats.pupil} position={[-0.0315, 0.0835, 0.093]} />
              <mesh geometry={geo.pupil} material={mats.pupil} position={[0.0315, 0.0835, 0.093]} />
              <mesh material={mats.hair} position={[-0.032, 0.106, 0.092]} rotation={[0, 0, -0.07]}>
                <boxGeometry args={[0.038, 0.007, 0.01]} />
              </mesh>
              <mesh material={mats.hair} position={[0.032, 0.106, 0.092]} rotation={[0, 0, 0.07]}>
                <boxGeometry args={[0.038, 0.007, 0.01]} />
              </mesh>
              <mesh geometry={geo.nose} material={mats.skin} />
              <mesh material={mats.mouth} position={[0, -0.002, 0.089]}>
                <boxGeometry args={[0.036, 0.006, 0.008]} />
              </mesh>

              {/* glasses */}
              <mesh
                geometry={geo.lens}
                material={mats.glasses}
                position={[-0.0335, 0.085, 0.1005]}
                scale={[1.15, 0.9, 1]}
              />
              <mesh
                geometry={geo.lens}
                material={mats.glasses}
                position={[0.0335, 0.085, 0.1005]}
                scale={[1.15, 0.9, 1]}
              />
              <mesh material={mats.glasses} position={[0, 0.09, 0.1005]}>
                <boxGeometry args={[0.026, 0.005, 0.006]} />
              </mesh>
              <mesh material={mats.glasses} position={[-0.0765, 0.087, 0.044]}>
                <boxGeometry args={[0.004, 0.006, 0.108]} />
              </mesh>
              <mesh material={mats.glasses} position={[0.0765, 0.087, 0.044]}>
                <boxGeometry args={[0.004, 0.006, 0.108]} />
              </mesh>
            </group>

            {/* arms */}
            <group ref={shoulderL} position={[-SHOULDER_X, SHOULDER_Y, 0]}>
              <Part g={geo.upperArm} m={mats.jacket} outline={hull} />
              <group ref={elbowL} position={[0, -L_UPPER, 0]}>
                <Part g={geo.elbow} m={mats.jacket} outline={hull} />
                <Part g={geo.forearm} m={mats.jacket} outline={hull} />
                <mesh geometry={geo.cuff} material={mats.shirt} position={[0, -0.238, 0]} />
                <group ref={handL} position={[0, -L_FORE, 0]}>
                  <Hand side={-1} mats={mats} outline={hull} geo={geo} />
                </group>
              </group>
            </group>
            <group ref={shoulderR} position={[SHOULDER_X, SHOULDER_Y, 0]}>
              <Part g={geo.upperArm} m={mats.jacket} outline={hull} />
              <group ref={elbowR} position={[0, -L_UPPER, 0]}>
                <Part g={geo.elbow} m={mats.jacket} outline={hull} />
                <Part g={geo.forearm} m={mats.jacket} outline={hull} />
                <mesh geometry={geo.cuff} material={mats.shirt} position={[0, -0.238, 0]} />
                <group ref={handR} position={[0, -L_FORE, 0]}>
                  <Hand side={1} mats={mats} outline={hull} geo={geo} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
      <mesh
        ref={shadow}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={mode === 'game' || pov !== 'fp'}
      >
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={blob} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </>
  )
}
