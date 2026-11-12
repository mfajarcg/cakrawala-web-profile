import * as THREE from 'three'
import { STATIONS } from '../journey/stations'

let cached: THREE.CatmullRomCurve3 | null = null

export function getPath() {
  if (!cached) {
    cached = new THREE.CatmullRomCurve3(
      STATIONS.map((s) => new THREE.Vector3(s.x, 0, s.z)),
      false,
      'catmullrom',
      0.15,
    )
  }
  return cached
}

/** world position of the character for a given progress 0..1 */
export function pointAt(progress: number, out = new THREE.Vector3()) {
  return getPath().getPointAt(THREE.MathUtils.clamp(progress, 0, 1), out)
}
