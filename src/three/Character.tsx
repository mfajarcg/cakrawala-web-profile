import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clamp01, useJourney } from '../journey/store'
import { getPath } from './path'
import { characterPos, characterSpeed, characterYaw } from './shared'

const SUIT = '#2e3a44'
const SHIRT = '#f7f9fa'
const SKIN = '#e8b98a'
const BRAND = '#408fb4'
const HAIR = '#1c2126'
const SHOE = '#101418'

// running model, from open biomechanics data:
// cadence 150-170 spm recreational (~2.6 steps/s), stride 1.86-2.96 m,
// full stride cycle ~0.5s; stance<swing when running; trunk leans forward.
const MAX_SPEED = 0.28 // progress units/s — a full journey sprint takes ~4s
const ACCELERATION = 0.95 // progress units/s^2 — ease-in/out curve
const WALK_STRIDE = 0.7 // m per step at low speed
const RUN_STRIDE = 1.35 // m per step at full speed
const TURN_RATE = 9 // rad/s damp when re-facing

const lerp = THREE.MathUtils.lerp
const clamp = THREE.MathUtils.clamp

/** exponential damp on an angle along the shortest arc */
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

export function Character() {
  const group = useRef<THREE.Group>(null)
  const pov = useJourney((s) => s.pov)
  const body = useRef<THREE.Group>(null)
  const lean = useRef<THREE.Group>(null)
  // legs: hip pivot -> thigh -> knee pivot -> shin
  const hipL = useRef<THREE.Group>(null)
  const hipR = useRef<THREE.Group>(null)
  const kneeL = useRef<THREE.Group>(null)
  const kneeR = useRef<THREE.Group>(null)
  // arms: shoulder pivot -> upper arm -> elbow pivot -> forearm
  const shoulderL = useRef<THREE.Group>(null)
  const shoulderR = useRef<THREE.Group>(null)
  const elbowL = useRef<THREE.Group>(null)
  const elbowR = useRef<THREE.Group>(null)

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

  useFrame((state, delta) => {
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

    characterPos.current.set(pos.x, 0, pos.z)
    const worldSpeed = Math.abs(s.velocity) * pathLength
    characterSpeed.current = clamp(worldSpeed / 6, 0, 1)
    tick(s.progress)

    const g = group.current
    if (!g) return
    g.position.set(pos.x, 0, pos.z)
    g.rotation.y = s.yaw
    characterYaw.current = s.yaw

    // --- gait: stride locked to distance travelled (no foot sliding)
    const speedNorm = clamp(worldSpeed / 6.5, 0, 1) // 0 idle .. 1 full run
    const stride = lerp(WALK_STRIDE, RUN_STRIDE, speedNorm)
    const stepsPerSec = worldSpeed / stride
    s.phase += stepsPerSec * Math.PI * dt * Math.max(turnBrake, 0.15)
    const ph = s.phase

    const hipAmp = lerp(0.28, 0.95, speedNorm)
    const kneeAmp = lerp(0.25, 1.15, speedNorm)
    const moving = speedNorm > 0.02 ? 1 : 0

    const swingL = Math.sin(ph) * hipAmp * moving
    const swingR = Math.sin(ph + Math.PI) * hipAmp * moving
    // knee flexes during the forward-swing half of its leg's cycle
    const kneeLAngle = Math.pow(Math.max(0, Math.sin(ph - Math.PI / 2)), 1.4) * kneeAmp * moving
    const kneeRAngle =
      Math.pow(Math.max(0, Math.sin(ph + Math.PI / 2)), 1.4) * kneeAmp * moving

    if (hipL.current) hipL.current.rotation.x = swingL
    if (hipR.current) hipR.current.rotation.x = swingR
    if (kneeL.current) kneeL.current.rotation.x = kneeLAngle
    if (kneeR.current) kneeR.current.rotation.x = kneeRAngle

    // arms counter-swing against the same-side leg; elbows pump with speed
    const pump = Math.sin(state.clock.elapsedTime * 2) * 0.05 * (1 - moving)
    if (shoulderL.current) shoulderL.current.rotation.x = swingR * -1 * 0.9 + pump
    if (shoulderR.current) shoulderR.current.rotation.x = swingL * -1 * 0.9 + pump
    const elbowBase = 0.35 + speedNorm * 0.45
    if (elbowL.current) elbowL.current.rotation.x = elbowBase
    if (elbowR.current) elbowR.current.rotation.x = elbowBase

    // vertical bob (2x per stride) and forward trunk lean while running
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(ph)) * lerp(0.02, 0.1, speedNorm) * moving
    }
    if (lean.current) {
      lean.current.rotation.x = speedNorm * speedNorm * 0.38 * moving
    }
  })

  return (
    <group ref={group} visible={pov !== 'fp'}>
      <group ref={body}>
        <group ref={lean}>
          {/* torso: suit + shirt + tie */}
          <mesh position={[0, 0.86, 0]}>
            <boxGeometry args={[0.44, 0.62, 0.26]} />
            <meshStandardMaterial color={SUIT} flatShading />
          </mesh>
          <mesh position={[0, 0.86, 0.135]}>
            <boxGeometry args={[0.18, 0.5, 0.02]} />
            <meshStandardMaterial color={SHIRT} flatShading />
          </mesh>
          <mesh position={[0, 0.89, 0.15]}>
            <boxGeometry args={[0.07, 0.34, 0.02]} />
            <meshStandardMaterial color={BRAND} flatShading />
          </mesh>

          {/* head + hair */}
          <mesh position={[0, 1.36, 0]}>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshStandardMaterial color={SKIN} flatShading />
          </mesh>
          <mesh position={[0, 1.46, -0.02]}>
            <boxGeometry args={[0.24, 0.12, 0.22]} />
            <meshStandardMaterial color={HAIR} flatShading />
          </mesh>

          {/* left arm: shoulder -> upper arm -> elbow -> forearm (+laptop) */}
          <group ref={shoulderL} position={[-0.29, 1.1, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.12]} />
              <meshStandardMaterial color={SUIT} flatShading />
            </mesh>
            <group ref={elbowL} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.11, 0]}>
                <boxGeometry args={[0.11, 0.22, 0.11]} />
                <meshStandardMaterial color={SUIT} flatShading />
              </mesh>
              <mesh position={[0, -0.24, 0.02]}>
                <sphereGeometry args={[0.07, 8, 6]} />
                <meshStandardMaterial color={SKIN} flatShading />
              </mesh>
              {/* laptop tucked against the forearm */}
              <mesh position={[-0.12, -0.16, 0.1]} rotation={[0.2, 0.3, 0.1]}>
                <boxGeometry args={[0.3, 0.22, 0.03]} />
                <meshStandardMaterial color={BRAND} flatShading />
              </mesh>
            </group>
          </group>

          {/* right arm */}
          <group ref={shoulderR} position={[0.29, 1.1, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.12, 0.26, 0.12]} />
              <meshStandardMaterial color={SUIT} flatShading />
            </mesh>
            <group ref={elbowR} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.11, 0]}>
                <boxGeometry args={[0.11, 0.22, 0.11]} />
                <meshStandardMaterial color={SUIT} flatShading />
              </mesh>
              <mesh position={[0, -0.24, 0.02]}>
                <sphereGeometry args={[0.07, 8, 6]} />
                <meshStandardMaterial color={SKIN} flatShading />
              </mesh>
            </group>
          </group>
        </group>

        {/* legs: hip -> thigh -> knee -> shin + shoe */}
        <group ref={hipL} position={[-0.12, 0.52, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.16, 0.26, 0.16]} />
            <meshStandardMaterial color={SUIT} flatShading />
          </mesh>
          <group ref={kneeL} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[0.14, 0.24, 0.14]} />
              <meshStandardMaterial color={SUIT} flatShading />
            </mesh>
            <mesh position={[0, -0.26, 0.05]}>
              <boxGeometry args={[0.15, 0.08, 0.26]} />
              <meshStandardMaterial color={SHOE} flatShading />
            </mesh>
          </group>
        </group>
        <group ref={hipR} position={[0.12, 0.52, 0]}>
          <mesh position={[0, -0.13, 0]}>
            <boxGeometry args={[0.16, 0.26, 0.16]} />
            <meshStandardMaterial color={SUIT} flatShading />
          </mesh>
          <group ref={kneeR} position={[0, -0.26, 0]}>
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[0.14, 0.24, 0.14]} />
              <meshStandardMaterial color={SUIT} flatShading />
            </mesh>
            <mesh position={[0, -0.26, 0.05]}>
              <boxGeometry args={[0.15, 0.08, 0.26]} />
              <meshStandardMaterial color={SHOE} flatShading />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}
