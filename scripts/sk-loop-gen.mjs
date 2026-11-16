// Regenerates src/three/runLoop.ts from the bone matrices produced by
// sk-loop-extract.mjs (run: node scripts/sk-loop-extract.mjs first).
// Knee = bip L Calf Z-hinge; elbow = bip L Forearm Z-hinge. Both are pure
// single-axis hinges (stability 1.0). Cycle is rotated so frame 6 = heel strike
// (u=0), matching Eric's jointAt convention; knee min at toe-off, peak in swing.
// Usage: node scripts/sk-loop-gen.mjs [matrices.json]
import { readFileSync, writeFileSync } from 'node:fs'
const SRC = process.argv[2] || 'C:/Users/USER/AppData/Local/Temp/run-loop-matrices.json'
const j = JSON.parse(readFileSync(SRC, 'utf8'))
const F = j.frames.length
const OFFSET = 6 // frame index that maps to u=0 (heel strike)

// flexion magnitude = positive rotation angle (hinge is about -Z, so use the
// trace-based angle which is sign-independent and always the flexion amount)
const zAngle = (m) => {
  const tr = m[0] + m[5] + m[10]
  return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)))
}
const series = (name) => {
  const a = []
  for (let f = 0; f < F; f++) a.push(zAngle(j.frames[f].pose[name].local))
  // rotate so OFFSET becomes index 0
  return a.slice(OFFSET).concat(a.slice(0, OFFSET))
}
const norm = (a) => {
  const min = Math.min(...a), max = Math.max(...a)
  return a.map((x) => (x - min) / (max - min))
}
const knee = norm(series('bip L Calf_024'))
const elbow = norm(series('bip L Forearm_09'))
const r4 = (a) => a.map((x) => +x.toFixed(4))

const ts = `// Run-loop joint shapes retargeted from the Sketchfab reference animation
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

export const RUN_LOOP_KEYS = ${knee.length}

export const KNEE_SHAPE = [${r4(knee).join(', ')}]
export const ELBOW_SHAPE = [${r4(elbow).join(', ')}]

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
`
writeFileSync('C:/Users/USER/Documents/Qoder/2026-11-12/a6322d0d/src/three/runLoop.ts', ts)
console.log('knee shape', r4(knee))
console.log('elbow shape', r4(elbow))
console.log('wrote src/three/runLoop.ts')