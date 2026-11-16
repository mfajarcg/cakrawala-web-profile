import { useFBX, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { getPath } from './path'
import { characterPos, characterYaw, gait } from './shared'

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models/eric/rp_eric_rigged_001_ue4.fbx`
const TEX_DIR = `${BASE}models/eric/tex/`
const MODEL_SCALE = 0.01 // the FBX is authored in centimetres

// running model, from open biomechanics data:
// cadence 150-170 spm recreational (~2.6 steps/s), stride 1.86-2.96 m,
// full stride cycle ~0.5s; stance<swing when running; trunk leans forward.
const MAX_SPEED = 0.28 // progress units/s — a full journey sprint takes ~4s
const ACCELERATION = 0.95 // progress units/s^2 — ease-in/out curve
const WALK_CADENCE = 2.0 // steps/s
const RUN_CADENCE = 3.4 // steps/s
const TURN_RATE = 9 // rad/s damp when re-facing

// the rig ships in a 45° A-pose; bring the arms down near the body
const ARM_ABDUCT = 0.52 // rad

// leg measurements in world units (FBX is in cm), used to keep the stance
// foot on the ground instead of letting the body float mid-stride
const L_THIGH = 0.42
const L_SHIN = 0.422
const HIP_HEIGHT = 0.969
const ANKLE_TO_SOLE = 0.127

const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

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
    phase: 0, // stride phase: advances PI per step
    facing: 1, // +1 walking forward along path, -1 walking back
    yaw: 0,
  })

  const curve = useMemo(() => getPath(), [])
  const pathLength = useMemo(() => curve.getLength(), [curve])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { target, tick } = useJourney.getState()
    const s = sim.current

    // --- longitudinal dynamics: desired speed -> acceleration-capped velocity
    const diff = clamp01(target) - s.progress
    const desired = clamp(diff * 4, -MAX_SPEED, MAX_SPEED)
    const dv = clamp(desired - s.velocity, -ACCELERATION * dt, ACCELERATION * dt)
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
    const yawErr = Math.abs(Math.atan2(Math.sin(targetYaw - s.yaw), Math.cos(targetYaw - s.yaw)))
    s.yaw = dampAngle(s.yaw, targetYaw, TURN_RATE, dt)

    // --- turn-in-place: sharply slow translation while the body re-faces
    const turnBrake = yawErr > 0.35 ? clamp(1 - (yawErr - 0.35) / 1.1, 0, 1) : 1
    s.progress = clamp01(s.progress + s.velocity * turnBrake * dt)

    // the diorama crosses ~26 world units per station, so a cadence locked to
    // world speed would strobe; drive the stride from human walking cadence
    const worldSpeed = Math.abs(s.velocity) * pathLength
    const speedNorm = clamp(worldSpeed / 6.5, 0, 1)
    const cadence = lerp(WALK_CADENCE, RUN_CADENCE, speedNorm)
    s.phase += cadence * Math.PI * dt * Math.max(turnBrake, 0.15)

    characterPos.current.set(pos.x, 0, pos.z)
    characterYaw.current = s.yaw
    gait.phase = s.phase
    gait.speedNorm = speedNorm
    gait.moving = speedNorm > 0.02 ? 1 : 0
    tick(s.progress)
  })

  return null
}

interface Poser {
  bone: THREE.Bone
  rest: THREE.Quaternion
  /** inverse of the bone's parent world rotation at rest, in character space */
  invParentQ: THREE.Quaternion
}

/** a joint that can be posed about axes expressed in character space */
function makePoser(model: THREE.Object3D, name: string): Poser | null {
  const bone = model.getObjectByName(name) as THREE.Bone | undefined
  const parent = bone?.parent
  if (!bone || !parent) return null
  const parentQ = new THREE.Quaternion()
  parent.getWorldQuaternion(parentQ)
  return { bone, rest: bone.quaternion.clone(), invParentQ: parentQ.invert() }
}

const _axis = new THREE.Vector3()
const _qAcc = new THREE.Quaternion()
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
  _qAcc.identity()
  _axis.copy(axisA).applyQuaternion(p.invParentQ)
  _qAcc.multiply(_qRot.setFromAxisAngle(_axis, angleA))
  if (Math.abs(angleB) > 1e-4) {
    _axis.copy(axisB).applyQuaternion(p.invParentQ)
    _qAcc.multiply(_qRot.setFromAxisAngle(_axis, angleB))
  }
  p.bone.quaternion.copy(p.rest).premultiply(_qAcc)
}

function EricVisual() {
  const fbx = useFBX(MODEL_URL)
  const [dif, norm] = useTexture([
    `${TEX_DIR}rp_eric_rigged_001_dif.jpg`,
    `${TEX_DIR}rp_eric_rigged_001_norm.jpg`,
  ])
  const root = useRef<THREE.Group>(null)
  const pov = useJourney((s) => s.pov)

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

    // elbow hinge: perpendicular to the A-pose arm and the forward axis,
    // then carried along by the arm's abduction
    const hinge = (side: 'l' | 'r') => {
      const a = new THREE.Vector3()
      const b = new THREE.Vector3()
      fbx.getObjectByName(`upperarm_${side}`)!.getWorldPosition(a)
      fbx.getObjectByName(`lowerarm_${side}`)!.getWorldPosition(b)
      const h = new THREE.Vector3().crossVectors(b.sub(a).normalize(), Z_AXIS).normalize()
      return h.applyAxisAngle(Z_AXIS, side === 'l' ? -ARM_ABDUCT : ARM_ABDUCT)
    }

    return {
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
      spine: makePoser(fbx, 'spine_01'),
      neck: makePoser(fbx, 'neck_01'),
      hingeL: hinge('l'),
      hingeR: hinge('r'),
    }
  }, [fbx, dif, norm])

  useFrame((state) => {
    const g = root.current
    if (!g) return
    const t = state.clock.elapsedTime
    const { phase, speedNorm, moving } = gait

    // amplitude fades out quickly when coming to a standstill
    const walkBlend = clamp(speedNorm / 0.14, 0, 1) * moving
    const hipAmp = lerp(0.28, 0.6, speedNorm) * walkBlend
    const kneeAmp = lerp(0.35, 1.2, speedNorm) * walkBlend

    const swingL = Math.sin(phase) * hipAmp // + = leg back
    const swingR = Math.sin(phase + Math.PI) * hipAmp
    // knee flexes through the swing half of its own cycle
    const kneeL = Math.pow(Math.max(0, Math.sin(phase - Math.PI / 2)), 1.4) * kneeAmp
    const kneeR = Math.pow(Math.max(0, Math.sin(phase + Math.PI / 2)), 1.4) * kneeAmp

    const armAmp = lerp(0.08, 0.8, speedNorm) * walkBlend
    const idle = Math.sin(t * 1.7) * 0.02 * (1 - moving)
    const armSwingL = -Math.sin(phase) * armAmp + idle
    const armSwingR = -Math.sin(phase + Math.PI) * armAmp + idle
    const elbowFlex = lerp(0.22, 1.25, speedNorm * speedNorm)

    poseBone(rig.thighL, X_AXIS, swingL, X_AXIS, 0)
    poseBone(rig.thighR, X_AXIS, swingR, X_AXIS, 0)
    poseBone(rig.calfL, X_AXIS, kneeL, X_AXIS, 0)
    poseBone(rig.calfR, X_AXIS, kneeR, X_AXIS, 0)
    // ankle keeps the sole roughly level with the ground
    poseBone(rig.footL, X_AXIS, -(swingL + kneeL) * 0.8, X_AXIS, 0)
    poseBone(rig.footR, X_AXIS, -(swingR + kneeR) * 0.8, X_AXIS, 0)

    poseBone(rig.armL, X_AXIS, armSwingL, Z_AXIS, -ARM_ABDUCT)
    poseBone(rig.armR, X_AXIS, armSwingR, Z_AXIS, ARM_ABDUCT)
    poseBone(rig.elbowL, rig.hingeL, elbowFlex, X_AXIS, 0)
    poseBone(rig.elbowR, rig.hingeR, elbowFlex, X_AXIS, 0)

    const lean = speedNorm * speedNorm * 0.3 * walkBlend
    poseBone(rig.spine, X_AXIS, lean, X_AXIS, 0)
    poseBone(rig.neck, X_AXIS, -lean * 0.75, X_AXIS, 0)

    // drop the pelvis just enough that the lowest foot rests on the ground
    const reach = (hip: number, knee: number) =>
      L_THIGH * Math.cos(hip) + L_SHIN * Math.cos(hip + knee)
    const stanceReach = Math.max(reach(swingL, kneeL), reach(swingR, kneeR))
    const soleGap = HIP_HEIGHT - stanceReach - ANKLE_TO_SOLE
    g.position.set(characterPos.current.x, -soleGap, characterPos.current.z)
    g.rotation.y = characterYaw.current
  })

  return (
    <group ref={root} scale={MODEL_SCALE} visible={pov !== 'fp'}>
      <primitive object={fbx} />
    </group>
  )
}
