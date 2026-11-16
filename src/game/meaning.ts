/**
 * The philosophical spine of the playground: the five services are not just
 * materials, they are the five layers a living system is built from —
 * foundation, craft, quality, change, care — in that order, from the ground up.
 * The order matches BLOCK_KINDS so hotbar slot N always equals layer N.
 */
export const LAYERS = ['server', 'cloud', 'doc', 'laptop', 'gear'] as const

export const LAYER_ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const

export type NoticeKey = 'first' | 'pair' | 'reject' | 'collapse' | 'complete' | 'vista'

export const NOTICE_KEYS: NoticeKey[] = ['first', 'pair', 'reject', 'collapse', 'complete', 'vista']

/** a block stands only on the ground or on another block — ideas need foundations */
export function isSupported(
  cell: { x: number; y: number; z: number },
  occupied: ReadonlySet<string>,
) {
  return cell.y === 0 || occupied.has(`${cell.x},${cell.y - 1},${cell.z}`)
}

/**
 * Longest ground-up run of layers in canonical order across all columns,
 * plus the tallest column. This is the "meaning" of the current structure.
 */
export function scanMeaning(blocks: readonly { x: number; y: number; z: number; kind: string }[]) {
  const byKey = new Map(blocks.map((b) => [`${b.x},${b.y},${b.z}`, b]))
  const columns = new Map<string, { x: number; z: number }>()
  let height = 0
  for (const b of blocks) {
    columns.set(`${b.x},${b.z}`, { x: b.x, z: b.z })
    height = Math.max(height, b.y + 1)
  }
  let progress = 0
  let column: { x: number; y: number; z: number }[] | null = null
  for (const { x, z } of columns.values()) {
    const run: { x: number; y: number; z: number }[] = []
    for (let y = 0; y < LAYERS.length; y++) {
      const b = byKey.get(`${x},${y},${z}`)
      if (!b || b.kind !== LAYERS[y]) break
      run.push({ x, y, z })
    }
    if (run.length > progress) {
      progress = run.length
      column = run
    }
  }
  return { progress, column, height }
}

/** removing a foundation brings down everything that rests on it */
export function cascade<T extends { x: number; y: number; z: number; kind: string }>(
  blocks: readonly T[],
  removed: ReadonlySet<string>,
) {
  let kept = blocks.filter((b) => !removed.has(`${b.x},${b.y},${b.z}`))
  for (;;) {
    const occupied = new Set(kept.map((b) => `${b.x},${b.y},${b.z}`))
    const next = kept.filter((b) => isSupported(b, occupied))
    if (next.length === kept.length) return { kept, fell: blocks.length - kept.length }
    kept = next
  }
}