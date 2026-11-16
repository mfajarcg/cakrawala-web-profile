import { useFBX, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { useGame } from '../game/store'
import { getPath } from './path'
import { cadenceFor, characterPos, characterYaw, gait } from './shared'

const BASE = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}models/eric/rp_eric_rigged_001_ue4.fbx`
const TEX_DIR = `${BASE}models/eric/tex/`
const MODEL_SCALE = 0.01 // the FBX is authored in centimetres

// Gait parameters follow published biomechanics: walking cadence 100-120 spm
// with a 60/40 stance-swing split and ~60° peak swing knee flexion; running
// cadence 150-170 spm with ~40/60 stance-swing, ~120-130° swing knee flexion
// and a forward trunk lean.
const MAX_SPEED = 0.085 // progress units/s
const ACCELERATION = 0.6 // progress units/s^2
const RUN_SPEED = 10.5 // world units/s that counts as a full run
const TURN_RATE = 9 // rad/s damp when re-facing

// the rig ships in a 45° A-pose; bring the arms down near the body
const ARM_ABDUCT = 0.52 // rad

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
      <Suspense fallback={null}>
        <AndrewVisual />
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
    if (useGame.getState().mode === 'game') return
    const s = sim.current

    // --- longitudinal dynamics: desired speed -> acceleration-capped velocity
    const targetP = clamp01(target)
    const jump = targetP - s.progress
    let cut = false
    // a nav link can skip most of the path; walking it would leave the camera
    // seconds behind the already-settled panel, so cut to the destination
    if (Math.abs(jump) > 0.16) {
      s.progress = targetP
      s.velocity = 0
      cut = true
    }
    const diff = targetP - s.progress
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
    if (cut) s.yaw = targetYaw
    const yawErr = Math.abs(Math.atan2(Math.sin(targetYaw - s.yaw), Math.cos(targetYaw - s.yaw)))
    s.yaw = dampAngle(s.yaw, targetYaw, TURN_RATE, dt)

    // --- turn-in-place: sharply slow translation while the body re-faces
    const turnBrake = yawErr > 0.35 ? clamp(1 - (yawErr - 0.35) / 1.1, 0, 1) : 1
    s.progress = clamp01(s.progress + s.velocity * turnBrake * dt)

    // cadence follows the actual ground speed, so the stride length matches the
    // distance covered and the feet grip the ground
    const worldSpeed = Math.abs(s.velocity) * pathLength
    const speedNorm = clamp(worldSpeed / RUN_SPEED, 0, 1)
    const cadence = cadenceFor(worldSpeed, speedNorm)
    s.phase += cadence * TAU * dt * Math.max(turnBrake, 0.15)

    characterPos.current.set(pos.x, 0, pos.z)
    characterYaw.current = s.yaw
    gait.phase = s.phase
    gait.speedNorm = speedNorm
    gait.moving = speedNorm > 0.02 ? 1 : 0
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
 * Knee flexion over one normalised gait cycle (0 = heel strike).
 * Walking holds a short loading-response bend through stance; running cycles
 * through a much deeper swing flexion.
 */
function kneeAt(u: number, speedNorm: number) {
  const stanceFrac = lerp(0.62, 0.4, speedNorm)
  if (u < stanceFrac) {
    const s = u / stanceFrac
    // loading response: knee gives then re-extends for push-off
    return lerp(0.32, 0.5, speedNorm) * Math.sin(Math.PI * Math.min(1, s * 1.35))
  }
  const s = (u - stanceFrac) / (1 - stanceFrac)
  const peak = lerp(1.05, 2.05, speedNorm) // ~60° walk, ~117° run
  return peak * Math.pow(Math.sin(Math.PI * Math.pow(s, 0.92)), 0.85)
}

// --- Andrew Ryan Sinaga likeness -------------------------------------------------
// The scan ships one diffuse atlas for the whole body, so outfit and skin are
// repainted per vertex from dominant skin weights plus spatial face masks, and
// the identifying accessories (glasses, smartwatch, rolled cuffs, band collar)
// are rigid meshes parented to the bones so the gait and jump poses carry them.
const SKIN = new THREE.Color('#c08a60')
const SKIN_SHADOW = new THREE.Color('#8a6a4c')
const SHIRT = new THREE.Color('#f2efe9')
const HAIR = new THREE.Color('#161719')
const PANTS = new THREE.Color('#23262b')
const SHOE = new THREE.Color('#141518')
const MOUTH = new THREE.Color('#6b3f33')
const TEETH = new THREE.Color('#e9e3da')
const EYE = new THREE.Color('#2e2620')

interface Likeness {
  eyeY: number
  faceX: number
  chinY: number
  collarY: number
  wristL: THREE.Vector3
  dirL: THREE.Vector3
  elbowL: THREE.Vector3
  elbowR: THREE.Vector3
  dirR: THREE.Vector3
}

function paintAndrew(fbx: THREE.Object3D): Likeness {
  let mesh: THREE.SkinnedMesh | null = null
  fbx.traverse((o) => {
    if (!mesh && (o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh
  })
  const m = mesh!
  const geo = m.geometry
  const pos = geo.attributes.position as THREE.BufferAttribute
  const idx = geo.attributes.skinIndex as THREE.BufferAttribute
  const wgt = geo.attributes.skinWeight as THREE.BufferAttribute
  const names = m.skeleton.bones.map((b) => b.name)
  const v = new THREE.Vector3()
  const rootSpace = new THREE.Matrix4().copy(fbx.matrixWorld).invert().multiply(m.matrixWorld)
  // bone space is centimetres; work in metres so face lines match real anatomy
  const rest = (i: number) => v.fromBufferAttribute(pos, i).applyMatrix4(rootSpace).multiplyScalar(0.01)
  const boneAt = (i: number) => {
    let best = 0
    let bw = -1
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k)
      if (w > bw) {
        bw = w
        best = idx.getComponent(i, k)
      }
    }
    return names[best] ?? ''
  }

  // head extents first: every face line is derived from the skull, not guessed
  let top = -Infinity
  let chin = Infinity
  for (let i = 0; i < pos.count; i++) {
    if (boneAt(i) !== 'head') continue
    rest(i)
    top = Math.max(top, v.y)
    chin = Math.min(chin, v.y)
  }
  const eyeY = chin + 0.52 * (top - chin)
  const mouthY = chin + 0.24 * (top - chin)
  const hairY = eyeY + 0.05
  const earY = eyeY - 0.015
  let faceX = 0
  let sideT = 0
  for (let i = 0; i < pos.count; i++) {
    if (boneAt(i) !== 'head') continue
    rest(i)
    if (Math.abs(v.y - eyeY) < 0.012) {
      faceX = Math.max(faceX, v.x)
      sideT = Math.max(sideT, Math.abs(v.z))
    }
  }
  sideT *= 0.78

  // shirt-front reference so the scan's tie ridge can be pressed flush
  let chestX = 0
  for (let i = 0; i < pos.count; i++) {
    if (boneAt(i) !== 'spine_02') continue
    rest(i)
    if (Math.abs(v.z) > 0.06 && Math.abs(v.z) < 0.1 && v.y > 1.25 && v.y < 1.45) {
      chestX = Math.max(chestX, v.x)
    }
  }
  const rootInvSpace = rootSpace
    .clone()
    .invert()
    .multiply(new THREE.Matrix4().makeScale(100, 100, 100))
  for (let i = 0; i < pos.count; i++) {
    const bone = boneAt(i)
    rest(i)
    let moved = false
    if (/^spine_/.test(bone) && Math.abs(v.z) < 0.04 && v.y > 1.12 && v.y < 1.53 && v.x > chestX) {
      v.x = chestX
      moved = true
    }
    if (
      (bone === 'neck_01' || bone === 'clavicle_l' || bone === 'clavicle_r' || (bone === 'spine_03' && v.y > 1.5)) &&
      v.y > 1.545
    ) {
      // fold the scan's spread collar down into a mandarin band
      const r = Math.hypot(v.x - 0.005, v.z)
      if (r > 0.062) {
        const k = 0.062 / r
        v.x = 0.005 + (v.x - 0.005) * k
        v.z *= k
        moved = true
      }
      if (v.y > chin + 0.012) {
        v.y = chin + 0.012
        moved = true
      }
    }
    if (moved) {
      v.applyMatrix4(rootInvSpace)
      pos.setXYZ(i, v.x, v.y, v.z)
    }
  }
  pos.needsUpdate = true

  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const bone = boneAt(i)
    rest(i)
    const az = Math.abs(v.z)
    if (/^(foot|ball)_/.test(bone)) c.copy(SHOE)
    else if (/^(thigh|calf)/.test(bone)) c.copy(PANTS)
    else if (/^(pelvis|spine_|clavicle|upperarm)/.test(bone)) {
      // below the waistline the scan's untucked shirt tail becomes trousers
      c.copy(v.y < 1.07 ? PANTS : SHIRT)
    } else if (/^(lowerarm|hand|thumb|index|middle|ring|pinky)/.test(bone)) c.copy(SKIN)
    else if (bone === 'neck_01') c.copy(v.y < chin + 0.045 ? SHIRT : SKIN)
    else if (bone === 'head') {
      const smile = 0.012 * Math.pow(Math.min(az, 0.03) / 0.03, 2)
      if (
        v.y > hairY + (v.x > faceX * 0.5 ? 0.035 : 0) ||
        (v.x < faceX * 0.25 && v.y > earY) ||
        (az > sideT * 0.9 && v.y > earY + 0.008)
      ) {
        c.copy(HAIR)
      } else if (v.x > faceX * 0.6 && az > 0.014 && az < 0.042 && Math.abs(v.y - eyeY) < 0.006) {
        c.copy(EYE)
      } else if (v.x > faceX * 0.55 && az < 0.03 && v.y > mouthY - 0.0045 + smile && v.y < mouthY + 0.0045 + smile) {
        c.copy(az < 0.022 && v.y > mouthY - 0.001 + smile && v.y < mouthY + 0.004 + smile ? TEETH : MOUTH)
      } else if (v.x > faceX * 0.25 && v.y > chin + 0.004 && v.y < mouthY - 0.012 && az < 0.05) {
        c.copy(SKIN).lerp(SKIN_SHADOW, 0.18)
      } else if (az > 0.045 && az < sideT && v.y > chin && v.y < earY && v.x > 0) {
        c.copy(SKIN).lerp(SKIN_SHADOW, 0.15)
      } else c.copy(SKIN)
    } else c.copy(SKIN)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const rootInv = new THREE.Matrix4().copy(fbx.matrixWorld).invert()
  const wp = (n: string) =>
    fbx
      .getObjectByName(n)!
      .getWorldPosition(new THREE.Vector3())
      .applyMatrix4(rootInv)
      .multiplyScalar(0.01)
  const handL = wp('hand_l')
  const lowL = wp('lowerarm_l')
  const lowR = wp('lowerarm_r')
  const handR = wp('hand_r')
  const dirL = handL.clone().sub(lowL).normalize()
  const dirR = handR.clone().sub(lowR).normalize()
  return {
    eyeY,
    faceX,
    chinY: chin,
    collarY: chin + 0.005,
    wristL: handL.clone().addScaledVector(dirL, -0.03),
    dirL,
    elbowL: lowL.clone().addScaledVector(dirL, 0.03),
    elbowR: lowR.clone().addScaledVector(dirR, 0.03),
    dirR,
  }
}

/** parent a rigid mesh to a bone with a fixed rest-world transform */
function boneAttach(fbx: THREE.Object3D, boneName: string, obj: THREE.Object3D, world: THREE.Matrix4) {
  const bone = fbx.getObjectByName(boneName)
  if (!bone) return
  // the cached FBX survives StrictMode remounts: replace, never accumulate
  for (const old of [...bone.children]) {
    if (!old.userData.andrew) continue
    bone.remove(old)
    old.traverse((o) => {
      const me = o as THREE.Mesh
      if (me.isMesh) {
        me.geometry.dispose()
        ;(me.material as THREE.Material).dispose()
      }
    })
  }
  obj.userData.andrew = true
  // express both the bone and the desired transform in fbx-root space so the
  // wrapper group's centimetre scale and live yaw never leak into the offset
  const rootInv = new THREE.Matrix4().copy(fbx.matrixWorld).invert()
  const boneInRoot = rootInv.clone().multiply(bone.matrixWorld)
  obj.matrixAutoUpdate = false
  // bone space is centimetres: scale the metre-authored accessory into it
  obj.matrix
    .copy(boneInRoot)
    .invert()
    .multiply(_s.makeScale(100, 100, 100))
    .multiply(world)
  obj.traverse((o) => {
    o.frustumCulled = false
  })
  bone.add(obj)
}

const _m = new THREE.Matrix4()
const _s = new THREE.Matrix4()
const _x = new THREE.Vector3()
const _y = new THREE.Vector3()
const _z = new THREE.Vector3()

function attachAndrew(fbx: THREE.Object3D, L: Likeness) {
  const black = new THREE.MeshStandardMaterial({ color: '#101113', roughness: 0.5 })
  const glass = new THREE.MeshStandardMaterial({
    color: '#565c63',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
  })
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.8, side: THREE.DoubleSide })
  const screen = new THREE.MeshStandardMaterial({
    color: '#0e2a33',
    emissive: '#0e3a46',
    emissiveIntensity: 0.7,
    roughness: 0.3,
  })
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    me.position.set(x, y, z)
    return me
  }

  // rectangular glasses: black rims with tinted lenses proud of the frame face
  const glasses = new THREE.Group()
  for (const s of [-1, 1]) {
    glasses.add(box(0.008, 0.04, 0.056, black, -0.001, 0, s * 0.033))
    glasses.add(box(0.01, 0.032, 0.048, glass, 0.001, 0, s * 0.033))
    glasses.add(box(0.1, 0.005, 0.006, black, -0.052, 0.014, s * 0.056))
  }
  glasses.add(box(0.008, 0.006, 0.018, black, 0, 0.01, 0))
  boneAttach(fbx, 'head', glasses, _m.makeTranslation(L.faceX, L.eyeY, 0))

  // smartwatch on the left wrist: strap ring around the forearm, face on top
  const n = _y.set(0, 1, 0).addScaledVector(L.dirL, -L.dirL.y).normalize()
  const xAxis = _x.crossVectors(n, L.dirL).normalize()
  const basis = new THREE.Matrix4().makeBasis(xAxis, n, L.dirL)
  const watch = new THREE.Group()
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.009, 10, 20), black)
  strap.quaternion.setFromUnitVectors(_z.set(0, 0, 1), L.dirL)
  watch.add(strap)
  const face = box(0.03, 0.012, 0.036, black, 0, 0, 0)
  face.quaternion.setFromRotationMatrix(basis)
  face.position.copy(n).multiplyScalar(0.03)
  watch.add(face)
  const scr = box(0.022, 0.004, 0.028, screen, 0, 0, 0)
  scr.quaternion.copy(face.quaternion)
  scr.position.copy(n).multiplyScalar(0.037)
  watch.add(scr)
  boneAttach(fbx, 'hand_l', watch, _m.makeTranslation(L.wristL.x, L.wristL.y, L.wristL.z))

  // rolled sleeve cuffs at both elbows
  for (const [bone, at, dir] of [
    ['lowerarm_l', L.elbowL, L.dirL],
    ['lowerarm_r', L.elbowR, L.dirR],
  ] as const) {
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.013, 10, 18), shirt)
    cuff.quaternion.setFromUnitVectors(_z.set(0, 0, 1), dir)
    boneAttach(fbx, bone, cuff, _m.makeTranslation(at.x, at.y, at.z))
  }
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

function AndrewVisual() {
  const fbx = useFBX(MODEL_URL)
  const [norm] = useTexture([`${TEX_DIR}rp_eric_rigged_001_norm.jpg`])
  const root = useRef<THREE.Group>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const blob = useBlobShadow()
  const jumpPose = useRef({ hip: 0, knee: 0, foot: 0, arm: 0, elbow: 0, spine: 0, neck: 0, w: 0 })
  const pov = useJourney((s) => s.pov)
  const mode = useGame((s) => s.mode)

  const rig = useMemo(() => {
    fbx.updateMatrixWorld(true)

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      normalMap: norm,
      roughness: 0.8,
      metalness: 0,
    })
    fbx.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.material = material
      mesh.frustumCulled = false
    })
    const likeness = paintAndrew(fbx)

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

    attachAndrew(fbx, likeness)

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
      spine: makePoser(fbx, 'spine_01'),
      neck: makePoser(fbx, 'neck_01'),
      hingeL: hinge('l'),
      hingeR: hinge('r'),
    }
  }, [fbx, norm])

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const dt = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const { phase, speedNorm, moving, lift } = gait

    // amplitude fades out quickly when coming to a standstill
    const walkBlend = clamp(speedNorm / 0.14, 0, 1) * moving
    const hipAmp = lerp(0.3, 0.62, speedNorm) * walkBlend // ~34°..71° total travel
    const swingFrac = lerp(0.38, 0.6, speedNorm)

    // each leg gets its own cycle position; the right leg is half a cycle behind
    const uL = ((phase / TAU) % 1 + 1) % 1
    const uR = (uL + 0.5) % 1

    const hipL = -Math.cos(TAU * uL) * hipAmp // + = leg back
    const hipR = -Math.cos(TAU * uR) * hipAmp
    const kneeL = kneeAt(uL, speedNorm) * walkBlend
    const kneeR = kneeAt(uR, speedNorm) * walkBlend

    const armAmp = lerp(0.1, 0.72, speedNorm) * walkBlend
    const idle = Math.sin(t * 1.7) * 0.02 * (1 - moving)
    const armSwingL = Math.cos(TAU * uL) * armAmp + idle
    const armSwingR = Math.cos(TAU * uR) * armAmp + idle
    const elbowFlex = lerp(0.22, 1.5, speedNorm * speedNorm)
    const lean = speedNorm * speedNorm * 0.32 * walkBlend

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
    const footFL = lerp(-(hipL + kneeL) * 0.85, jp.foot, w)
    const footFR = lerp(-(hipR + kneeR) * 0.85, jp.foot, w)
    const armFL = lerp(armSwingL, jp.arm, w)
    const armFR = lerp(armSwingR, jp.arm, w)
    const elbowF = lerp(elbowFlex, jp.elbow, w)
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
    poseBone(rig.elbowL, rig.hingeL, elbowF, rig.flex, 0)
    poseBone(rig.elbowR, rig.hingeR, elbowF, rig.flex, 0)

    poseBone(rig.spine, rig.flex, leanF, rig.flex, 0)
    poseBone(rig.neck, rig.flex, neckF, rig.flex, 0)

    // drop the pelvis just enough that the stance foot rests on the ground;
    // during flight both feet are tucked, so the body flies
    const reach = (hip: number, knee: number) =>
      L_THIGH * Math.cos(hip) + L_SHIN * Math.cos(hip + knee)
    const stanceL = uL < 1 - swingFrac
    const stanceR = uR < 1 - swingFrac
    const flight = js === 2 ? 1 : stanceL || stanceR ? 0 : 1
    const support =
      js === 2
        ? HIP_HEIGHT - ANKLE_TO_SOLE
        : js === 1 || js === 3
          ? reach(hipFL, kneeFL)
          : flight
            ? HIP_HEIGHT - ANKLE_TO_SOLE
            : Math.max(
                stanceL ? reach(hipFL, kneeFL) : -Infinity,
                stanceR ? reach(hipFR, kneeFR) : -Infinity,
              )
    const soleGap = HIP_HEIGHT - ANKLE_TO_SOLE - support
    const bodyY = -soleGap + lift + flight * 0.025 * speedNorm * walkBlend
    const baseY = characterPos.current.y

    g.position.set(characterPos.current.x, baseY + bodyY, characterPos.current.z)
    g.rotation.y = characterYaw.current

    if (shadow.current) {
      const fade = clamp(1 - lift / 1.6, 0.25, 1)
      const landPulse = js === 3 ? (1 - clamp(gait.landT / 0.3, 0, 1)) * 0.3 * gait.impact : 0
      // the path ribbon's top face sits at y≈0.033, so the shadow has to clear
      // it or it disappears underneath
      shadow.current.position.set(characterPos.current.x, baseY + 0.045, characterPos.current.z)
      shadow.current.scale.setScalar(1 + lift * 0.35 + landPulse)
      ;(shadow.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * fade
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
