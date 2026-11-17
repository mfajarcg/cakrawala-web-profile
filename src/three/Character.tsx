import { useFBX, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { getPath } from './path'
import {
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

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models/eric/rp_eric_rigged_001_ue4.fbx`
const TEX_DIR = `${BASE}models/eric/tex/`
const MODEL_SCALE = 0.01 // the FBX is authored in centimetres

// Gait parameters follow published biomechanics: walking cadence ~128 spm with
// a 62/38 stance-swing split and ~60° peak swing knee flexion; running cadence
// ~176 spm with ~40/60 stance-swing, ~120° swing knee flexion peaked early in
// swing, an ankle plantarflexion push-off, flight phases and a forward trunk
// lean (Perry & Burnfield 2010; Novacheck 1998; Physio-pedia Running Biomechanics).
// The run knee/elbow flexion SHAPE is retargeted from the Sketchfab reference
// "Male Running (20 frames loop)" by Denys Almaral (see runLoop.ts); amplitudes
// stay calibrated to Eric's proportions so the reach() foot-lock holds.
const JOURNEY_SPEED = 3.4 // world m/s of a full-speed checkpoint hop
const JOURNEY_ACCEL = 2.0 // world m/s^2
const TURN_RATE = 9 // rad/s damp when re-facing

// the rig ships in a 45° A-pose; bring the arms down near the body
const ARM_ABDUCT = 0.6 // rad
// palm pronation toward the thigh and finger-curl sense, checked against the
// bind pose landmarks (palm normal = finger × thumb plane)
const PRON = 0.47
const CURL_SIGN = 1

// leg measurements in world units (FBX is in cm), used to keep the stance
// foot on the ground instead of letting the body float mid-stride
const L_THIGH = 0.42
const L_SHIN = 0.422
const HIP_HEIGHT = 0.969
const ANKLE_TO_SOLE = 0.127

const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

const TAU = Math.PI * 2
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
      <Suspense fallback={null}>
        <EricVisual />
      </Suspense>
    </>
  )
}

/**
 * Walks the character along the isometric path and publishes its pose for the
 * camera rig and the rigged model. Separate from the visual so the model can
 * load asynchronously without stalling the journey.
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
    const desired = clamp(diff * 4, -maxSpeed, maxSpeed)
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
    s.progress = clamp01(s.progress + s.velocity * turnBrake * dt)

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

interface Poser {
  bone: THREE.Bone
  rest: THREE.Quaternion
  /** inverse of the bone's own rest rotation in character space */
  invRestWorldQ: THREE.Quaternion
}

/** a joint that can be posed about axes expressed in character space */
function makePoser(model: THREE.Object3D, name: string): Poser | null {
  const bone = model.getObjectByName(name) as THREE.Bone | undefined
  const parent = bone?.parent
  if (!bone || !parent) return null
  const parentQ = new THREE.Quaternion()
  parent.getWorldQuaternion(parentQ)
  const rest = bone.quaternion.clone()
  return {
    bone,
    rest,
    invRestWorldQ: parentQ.multiply(rest).invert(),
  }
}

const _axis = new THREE.Vector3()
const _qRot = new THREE.Quaternion()

/**
 * Rotate a bone about one or two axes given in character space (forward +Z,
 * up +Y, the character's left +X) regardless of the rig's own bone bases.
 */
function poseBone(
  p: Poser | null,
  axisA: THREE.Vector3,
  angleA: number,
  axisB: THREE.Vector3,
  angleB: number,
) {
  if (!p) return
  // express the character-space axis in the bone's rest-world frame and
  // post-multiply, so the net world rotation is about the character axis
  _axis.copy(axisA).applyQuaternion(p.invRestWorldQ)
  p.bone.quaternion.copy(p.rest).multiply(_qRot.setFromAxisAngle(_axis, angleA))
  if (Math.abs(angleB) > 1e-4) {
    _axis.copy(axisB).applyQuaternion(p.invRestWorldQ)
    p.bone.quaternion.multiply(_qRot.setFromAxisAngle(_axis, angleB))
  }
}

/**
 * Sagittal joint targets over one normalised cycle (u = 0 at heel strike),
 * flexion positive, walk and run parameter sets blended by speedNorm.
 * Stance: hip extends linearly, knee absorbs then re-extends. Swing: knee
 * flexes to its peak early (heel toward the butt) then extends before contact;
 * the hip drives forward. `ankle` is the WORLD foot angle (toes-down positive):
 * slightly toes-up at contact, flat through mid-stance, plantarflexed push-off,
 * dorsiflexed clearance in swing — the poser cancels the shin tilt separately.
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
  // Eric's run range (0.26 rad extended → 2.09 rad swing fold); blended in by
  // speed so walking keeps the analytic curve and running adopts the reference
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

function EricVisual() {
  const fbx = useFBX(MODEL_URL)
  const [dif, norm] = useTexture([
    `${TEX_DIR}rp_eric_rigged_001_dif.jpg`,
    `${TEX_DIR}rp_eric_rigged_001_norm.jpg`,
  ])
  const root = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const blob = useBlobShadow()
  const jumpPose = useRef({ hip: 0, knee: 0, foot: 0, arm: 0, elbow: 0, spine: 0, neck: 0, w: 0 })
  const pov = useJourney((s) => s.pov)
  const mode = useGame((s) => s.mode)

  const rig = useMemo(() => {
    fbx.updateMatrixWorld(true)

    dif.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.MeshStandardMaterial({
      map: dif,
      normalMap: norm,
      roughness: 0.78,
      metalness: 0,
    })
    fbx.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = material
      mesh.frustumCulled = false
    })

    // The FBX is UE4-authored, so its character axes are NOT three's +X left /
    // +Z forward. Derive the true anatomical axes from bone landmarks so that
    // "flexion" really swings limbs in the sagittal plane instead of twisting
    // them about their long axis (which is invisible on a straight leg).
    const worldPos = (name: string) => {
      const v = new THREE.Vector3()
      fbx.getObjectByName(name)?.getWorldPosition(v)
      return v
    }
    const up = worldPos('head').sub(worldPos('pelvis'))
    if (up.lengthSq() < 1e-8) up.copy(Y_AXIS)
    up.normalize()
    const front = worldPos('ball_l').sub(worldPos('foot_l'))
    front.addScaledVector(up, -front.dot(up))
    if (front.lengthSq() < 1e-8) front.copy(Z_AXIS)
    front.normalize()
    const flex = new THREE.Vector3().crossVectors(up, front).normalize()

    // elbow hinge: perpendicular to the A-pose arm and the forward axis,
    // then carried along by the arm's abduction
    const hinge = (side: 'l' | 'r') => {
      const a = new THREE.Vector3()
      const b = new THREE.Vector3()
      fbx.getObjectByName(`upperarm_${side}`)!.getWorldPosition(a)
      fbx.getObjectByName(`lowerarm_${side}`)!.getWorldPosition(b)
      const h = new THREE.Vector3().crossVectors(b.sub(a).normalize(), front).normalize()
      return h.applyAxisAngle(front, side === 'l' ? -ARM_ABDUCT : ARM_ABDUCT)
    }

    // wrist & finger curl axes derived from the bind-pose hand landmarks: the
    // palm normal is the finger/thumb plane, so a curl always folds toward the
    // palm whatever orientation the rig ships in
    const forearmAxis = (side: 'l' | 'r') =>
      worldPos(`hand_${side}`).sub(worldPos(`lowerarm_${side}`)).normalize()
    const fingerSet = (side: 'l' | 'r') => {
      const hand = worldPos(`hand_${side}`)
      const fDir = worldPos(`middle_03_${side}`).sub(hand).normalize()
      const tDir = worldPos(`thumb_01_${side}`).sub(hand).normalize()
      const palm = new THREE.Vector3().crossVectors(fDir, tDir).normalize()
      const set: { p: Poser | null; axis: THREE.Vector3; row: number; thumb: boolean }[] = []
      for (const name of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
        for (let j = 1; j <= 3; j++) {
          const next = j === 3 ? `${name}_end_${side}` : `${name}_0${j + 1}_${side}`
          const dir = worldPos(next).sub(worldPos(`${name}_0${j}_${side}`)).normalize()
          set.push({
            p: makePoser(fbx, `${name}_0${j}_${side}`),
            axis: new THREE.Vector3().crossVectors(dir, palm).normalize(),
            row: j,
            thumb: name === 'thumb',
          })
        }
      }
      return set
    }

    return {
      flex,
      front,
      thighL: makePoser(fbx, 'thigh_l'),
      calfL: makePoser(fbx, 'calf_l'),
      footL: makePoser(fbx, 'foot_l'),
      thighR: makePoser(fbx, 'thigh_r'),
      calfR: makePoser(fbx, 'calf_r'),
      footR: makePoser(fbx, 'foot_r'),
      armL: makePoser(fbx, 'upperarm_l'),
      elbowL: makePoser(fbx, 'lowerarm_l'),
      armR: makePoser(fbx, 'upperarm_r'),
      elbowR: makePoser(fbx, 'lowerarm_r'),
      handL: makePoser(fbx, 'hand_l'),
      handR: makePoser(fbx, 'hand_r'),
      foreL: forearmAxis('l'),
      foreR: forearmAxis('r'),
      fingersL: fingerSet('l'),
      fingersR: fingerSet('r'),
      spine: makePoser(fbx, 'spine_01'),
      neck: makePoser(fbx, 'neck_01'),
      hingeL: hinge('l'),
      hingeR: hinge('r'),
    }
  }, [fbx, dif, norm])

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
    const uL = ((phase / TAU) % 1 + 1) % 1
    const uR = (uL + 0.5) % 1

    const jL = jointAt(uL, speedNorm)
    const jR = jointAt(uR, speedNorm)
    // pose sign: + about the flex axis swings a limb BACK, so flexion is negative
    const hipL = -jL.hip * walkBlend
    const hipR = -jR.hip * walkBlend
    const kneeL = jL.knee * walkBlend
    const kneeR = jR.knee * walkBlend
    const ankleL = jL.ankle * walkBlend
    const ankleR = jR.ankle * walkBlend

    // arms counter-swing the legs about a CENTRED shoulder range (the raw hip
    // curve is asymmetric): walking ±15°, running ±35° so the hand travels
    // hip-pocket → chin instead of hovering in front of the chest. The elbow
    // is not a locked 90°: it closes front-side and opens back-side as the
    // shoulder extends (Freelap "A Call to Arms"; Pfaff), using the reference
    // loop's elbow shape with the phase flipped to match that open/close rule.
    const hipMean = lerp(0.17, 0.21, speedNorm)
    const armGain = lerp(0.75, 1.08, speedNorm) * walkBlend
    const idle = Math.sin(t * 1.7) * 0.02 * (1 - moving)
    const armSwingL = (jL.hip - hipMean) * armGain + idle
    const armSwingR = (jR.hip - hipMean) * armGain + idle
    const elbowBase = lerp(0.35, 1.57, speedNorm * speedNorm)
    const elbowOsc = lerp(0.12, 1.0, speedNorm) * walkBlend
    const elbowFlexL = elbowBase + (0.5 - sampleLoop(ELBOW_SHAPE, uL)) * elbowOsc
    const elbowFlexR = elbowBase + (0.5 - sampleLoop(ELBOW_SHAPE, uR)) * elbowOsc
    // relaxed cupped hand (never splayed, never a tight fist): fingers curl,
    // palm pronates toward the thigh, wrist near neutral with a small
    // extension flick as the arm sweeps back
    const CURL = [
      0,
      lerp(0.35, 0.75, speedNorm),
      lerp(0.45, 0.85, speedNorm),
      lerp(0.3, 0.55, speedNorm),
    ]
    const wristL = -0.15 * speedNorm * walkBlend * (armSwingL / 0.61)
    const wristR = -0.15 * speedNorm * walkBlend * (armSwingR / 0.61)
    const lean = (speedNorm * speedNorm * 0.22 + speedNorm * 0.04) * walkBlend

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

    const hipFL = lerp(hipL, jp.hip, w)
    const hipFR = lerp(hipR, jp.hip, w)
    const kneeFL = lerp(kneeL, jp.knee, w)
    const kneeFR = lerp(kneeR, jp.knee, w)
    const footFL = lerp(-(hipL + kneeL) + ankleL, jp.foot, w)
    const footFR = lerp(-(hipR + kneeR) + ankleR, jp.foot, w)
    const armFL = lerp(armSwingL, jp.arm, w)
    const armFR = lerp(armSwingR, jp.arm, w)
    const elbowFL = lerp(elbowFlexL, jp.elbow, w)
    const elbowFR = lerp(elbowFlexR, jp.elbow, w)
    const leanF = lerp(lean, jp.spine, w)
    const neckF = lerp(-lean * 0.75, jp.neck, w)

    poseBone(rig.thighL, rig.flex, hipFL, rig.flex, 0)
    poseBone(rig.thighR, rig.flex, hipFR, rig.flex, 0)
    poseBone(rig.calfL, rig.flex, kneeFL, rig.flex, 0)
    poseBone(rig.calfR, rig.flex, kneeFR, rig.flex, 0)
    // ankle keeps the sole roughly level with the ground
    poseBone(rig.footL, rig.flex, footFL, rig.flex, 0)
    poseBone(rig.footR, rig.flex, footFR, rig.flex, 0)

    poseBone(rig.armL, rig.flex, armFL, rig.front, -ARM_ABDUCT)
    poseBone(rig.armR, rig.flex, armFR, rig.front, ARM_ABDUCT)
    poseBone(rig.elbowL, rig.hingeL, elbowFL, rig.flex, 0)
    poseBone(rig.elbowR, rig.hingeR, elbowFR, rig.flex, 0)
    poseBone(rig.handL, rig.foreL, PRON, rig.flex, wristL)
    poseBone(rig.handR, rig.foreR, -PRON, rig.flex, wristR)
    for (const f of rig.fingersL)
      poseBone(f.p, f.axis, CURL[f.row] * (f.thumb ? 0.6 : 1) * CURL_SIGN, rig.flex, 0)
    for (const f of rig.fingersR)
      poseBone(f.p, f.axis, CURL[f.row] * (f.thumb ? 0.6 : 1) * -CURL_SIGN, rig.flex, 0)

    poseBone(rig.spine, rig.flex, leanF, rig.flex, 0)
    poseBone(rig.neck, rig.flex, neckF, rig.flex, 0)

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
          ? reach(hipFL, kneeFL)
          : flightProg >= 0
            ? lerp(
                reach(-jTO.hip * walkBlend, jTO.knee * walkBlend),
                reach(-jIC.hip * walkBlend, jIC.knee * walkBlend),
                flightProg,
              ) + Math.sin(Math.PI * flightProg) * lerp(0, 0.06, speedNorm) * walkBlend
            : Math.max(
                stanceL ? reach(hipFL, kneeFL) : -Infinity,
                stanceR ? reach(hipFR, kneeFR) : -Infinity,
              )
    const soleGap = HIP_HEIGHT - ANKLE_TO_SOLE - support
    const bodyY = -soleGap + lift
    const baseY = characterPos.current.y

    g.position.set(characterPos.current.x, baseY + bodyY, characterPos.current.z)
    g.rotation.y = characterYaw.current
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__ericDebug = { g }
    }

    // teleport: dematerialise shrink + rise + spin, hidden during the whoosh,
    // easeOutBack rematerialise at the destination beam
    const ts = tpScale(teleport.t)
    if (teleport.t >= 0) {
      const hidden = 1 - clamp(ts, 0, 1)
      g.position.y += hidden * 0.4
      if (teleport.t < TP_VANISH) g.rotation.y += hidden * 3
    }
    g.scale.setScalar(MODEL_SCALE * Math.max(ts, 0.0001))
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
  })

  return (
    <>
      <group ref={root} scale={MODEL_SCALE} visible={mode === 'game' || pov !== 'fp'}>
        <primitive object={fbx} />
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
