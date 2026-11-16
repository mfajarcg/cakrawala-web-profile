import * as THREE from 'three'

/** live world position of the character, written every frame by <CharacterDriver/> */
export const characterPos = { current: new THREE.Vector3() }

/** current facing of the character (yaw, radians) */
export const characterYaw = { current: 0 }

/** gait state written by the driver, read by the rigged model */
export const gait = {
  phase: 0, // stride phase, advances PI per step
  speedNorm: 0, // 0 idle .. 1 full run
  moving: 0, // 0 when standing
  lift: 0, // world units of the body above its surface (game jumps)
}

// ground distance covered by one full gait cycle (two steps) at each end of the
// speed range; cadence is derived from these so a planted foot stays planted
export const STRIDE_WALK = 1.6
export const STRIDE_RUN = 3.4
export const MAX_CADENCE = 3.3

/** gait cycles/s for a given ground speed, so feet grip instead of skating */
export function cadenceFor(speed: number, speedNorm: number) {
  const stride = STRIDE_WALK + (STRIDE_RUN - STRIDE_WALK) * speedNorm
  return THREE.MathUtils.clamp(speed / stride, 0.2, MAX_CADENCE)
}
