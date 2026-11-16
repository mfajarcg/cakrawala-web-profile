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
