import * as THREE from 'three'

/** live world position of the character, written every frame by <Character/> */
export const characterPos = { current: new THREE.Vector3() }

/** 0..1 how fast the character is currently moving (drives walk-cycle) */
export const characterSpeed = { current: 0 }
