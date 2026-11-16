// Run-loop joint shapes retargeted from the Sketchfab reference animation
// "Male Running (20 frames loop)" by Denys Almaral (Free Standard license).
// https://sketchfab.com/3d-models/male-running-20-frames-loop-ed3d7a4b8b124e1591be83ccb4c02dcd
// The 20-frame cycle (0.667 s @ 30 fps) was sampled through the Sketchfab Viewer
// API; the knee (bip L Calf) and elbow (bip L Forearm) are clean single-axis
// hinges, so their local Z-rotation gives the authentic flexion curve. Each
// curve is normalised 0..1 and rotated so index 0 = heel strike, then mapped
// onto Eric's calibrated joint ranges in Character.tsx. The shape (loading-
// response bump, asymmetric swing fold) is the reference's; amplitudes stay
// Eric's so the reach() foot-lock solver keeps the stance sole grounded.
// Periodic Catmull-Rom keeps the loop C1-smooth across the wrap.

export const KNEE_SHAPE = [0.0684, 0.0978, 0.1615, 0.2158, 0.2929, 0.2177, 0.0696, 0, 0.0965, 0.2459, 0.4158, 0.5743, 0.7152, 0.8546, 0.9941, 1, 0.9334, 0.6666, 0.3355, 0.1173]
export const ELBOW_SHAPE = [1, 0.9859, 0.8046, 0.5092, 0.2153, 0.0388, 0, 0.0269, 0.0966, 0.186, 0.2721, 0.3653, 0.4822, 0.6084, 0.73, 0.7194, 0.7089, 0.724, 0.8016, 0.9161]

// periodic Catmull-Rom sample of a normalised key loop at phase u in [0,1)
export function sampleLoop(keys: number[], u: number): number {
  const n = keys.length
  const x = (((u % 1) + 1) % 1) * n
  const i = Math.floor(x)
  const t = x - i
  const p0 = keys[(i - 1 + n) % n]
  const p1 = keys[i % n]
  const p2 = keys[(i + 1) % n]
  const p3 = keys[(i + 2) % n]
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}
