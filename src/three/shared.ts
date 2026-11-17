import * as THREE from 'three'

/** live world position of the character, written every frame by <CharacterDriver/> */
export const characterPos = { current: new THREE.Vector3() }

/** current facing of the character (yaw, radians) */
export const characterYaw = { current: 0 }

/** gait state written by the driver, read by the rigged model */
export const gait = {
  phase: 0, // stride phase, advances PI per step
  speedNorm: 0, // 0 walk .. 1 full run (see gaitNorm)
  move01: 0, // 0 standing .. 1 at any real ground speed; fades stride amplitude
  moving: 0, // 0 when standing
  lift: 0, // world units of the body above its surface (game jumps)
  /** countermovement jump: 0 idle, 1 braking dip, 2 flight, 3 landing absorption */
  jumpState: 0,
  crouch: 0, // 0..1 dip depth while braking
  vy: 0, // vertical velocity; sign splits rise from fall
  airT: 0, // seconds since take-off
  landT: 0, // seconds since touch-down
  impact: 0, // 0..1 touch-down speed relative to take-off speed
}

// ground distance covered by one full gait cycle (TWO steps) in metres;
// cadence is derived from these so a planted foot stays planted. Walk cycle
// 1.5 m at 1.6 m/s ≈ 128 spm; run cycle 3.0 m at 4.4 m/s ≈ 176 spm, inside the
// published running cadence band (Novacheck 1998; Physio-pedia Running Biomechanics).
export const STRIDE_WALK = 1.5
export const STRIDE_RUN = 3.0
export const MAX_CADENCE = 1.9 // cycles/s ≈ 228 spm sprint ceiling
export const RUN_SPEED = 4.4 // world m/s that counts as a full run
const WALK_PLATEAU = 1.9 // m/s below which the gait stays a pure walk

/**
 * Walk↔run blend. Speeds up to a brisk walk keep the walk pose entirely;
 * scaling from zero instead made every stroll a half-run with folded knees.
 */
export function gaitNorm(speed: number) {
  return THREE.MathUtils.clamp((speed - WALK_PLATEAU) / (RUN_SPEED - WALK_PLATEAU), 0, 1)
}

/** gait cycles/s for a given ground speed, so feet grip instead of skating */
export function cadenceFor(speed: number, speedNorm: number) {
  const stride = STRIDE_WALK + (STRIDE_RUN - STRIDE_WALK) * speedNorm
  return THREE.MathUtils.clamp(speed / stride, 0.2, MAX_CADENCE)
}

// --- teleport (non-sequential section jumps) -------------------------------
// A nav/rail/scrollbar jump skips most of the path; walking it would leave the
// character seconds behind the settled panel. Instead of a bare cut, the driver
// runs a beam-from-above dematerialise → camera whoosh → rematerialise sequence.
export const TP_DUR = 0.95
export const TP_VANISH = 0.3
export const TP_WHOOSH = 0.25
export const TP_MATERIALISE = 0.55

export const teleport = {
  t: -1, // seconds since trigger, -1 = idle
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** camera/character travel between the two beams, 0 before the whoosh */
export function tpWhoosh(t: number) {
  return easeInOutCubic(THREE.MathUtils.clamp((t - TP_VANISH) / TP_WHOOSH, 0, 1))
}

/** body scale: shrink out, hidden during the whoosh, overshoot back in */
export function tpScale(t: number) {
  if (t < 0) return 1
  if (t < TP_VANISH) {
    const u = t / TP_VANISH
    return 1 - u * u
  }
  if (t < TP_MATERIALISE) return 0
  const u = THREE.MathUtils.clamp((t - TP_MATERIALISE) / (TP_DUR - TP_MATERIALISE), 0, 1)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2)
}

/** beam opacity envelope: origin beam dies as the destination beam ignites */
export function tpBeam(t: number, dest: boolean) {
  if (t < 0) return 0
  const start = dest ? 0.45 : 0
  const inU = THREE.MathUtils.clamp((t - start) / 0.1, 0, 1)
  const outU = THREE.MathUtils.clamp((t - (dest ? 0.75 : 0.32)) / 0.2, 0, 1)
  return inU * (1 - outU)
}

/** ground shockwave ring at the destination while the body rematerialises */
export function tpRing(t: number) {
  if (t < TP_MATERIALISE) return 0
  return THREE.MathUtils.clamp((t - TP_MATERIALISE) / (TP_DUR - TP_MATERIALISE), 0, 1)
}

// --- free adventure (Jakarta 2045) -----------------------------------------
/** day↔night atmosphere mix, written by <Atmosphere/>, read by city materials */
export const atmoMix = { night: 0 }

/** pending free-roam spawn in world coords; beam plays the teleport grammar */
export const adventureSpawn = {
  x: null as number | null,
  z: null as number | null,
  beam: false,
}
