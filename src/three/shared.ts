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
}
