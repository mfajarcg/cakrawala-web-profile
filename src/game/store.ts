import { create } from 'zustand'
import { STATIONS } from '../journey/stations'
import { scrollBridge } from '../journey/scroll'

export const BLOCK_KINDS = ['server', 'cloud', 'doc', 'laptop', 'gear'] as const
export type BlockKind = (typeof BLOCK_KINDS)[number]

export const BLOCK_COLORS: Record<BlockKind, string> = {
  server: '#408fb4',
  cloud: '#5aa66f',
  doc: '#f2b23c',
  laptop: '#2e6f8e',
  gear: '#8a6b4a',
}

export interface Cell {
  x: number
  y: number
  z: number
}

export interface PlacedBlock extends Cell {
  kind: BlockKind
}

export type Mode = 'site' | 'game'

/** half-size of the buildable arena, in one-unit cells */
export const ARENA_HALF = 11
export const ARENA_MAX_Y = 10
export const PLAY_STATION = STATIONS.findIndex((s) => s.id === 'play')

const STORE_KEY = 'cakrawala-play-world-v1'

export function cellKey(c: Cell) {
  return `${c.x},${c.y},${c.z}`
}

function isKind(v: unknown): v is BlockKind {
  return typeof v === 'string' && (BLOCK_KINDS as readonly string[]).includes(v)
}

/** a small welcome structure so the arena reads as a world, not a blank floor */
function starterBuild(): PlacedBlock[] {
  const out: PlacedBlock[] = []
  const kinds: BlockKind[] = ['server', 'cloud', 'doc', 'laptop', 'gear']
  for (let x = -5; x <= -3; x++) {
    for (let z = 0; z <= 2; z++) {
      out.push({ x, y: 0, z, kind: kinds[(x + z + 8) % kinds.length] })
    }
  }
  out.push({ x: -4, y: 1, z: 1, kind: 'doc' })
  out.push({ x: -4, y: 2, z: 1, kind: 'server' })
  return out
}

function loadBlocks(): PlacedBlock[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw == null) {
      const seed = starterBuild()
      saveBlocks(seed)
      return seed
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: PlacedBlock[] = []
    for (const b of parsed) {
      if (!b || !Number.isInteger(b.x) || !Number.isInteger(b.y) || !Number.isInteger(b.z)) continue
      if (!isKind(b.kind)) continue
      if (Math.abs(b.x) > ARENA_HALF || Math.abs(b.z) > ARENA_HALF) continue
      if (b.y < 0 || b.y >= ARENA_MAX_Y) continue
      const key = cellKey(b)
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ x: b.x, y: b.y, z: b.z, kind: b.kind })
    }
    return out
  } catch {
    return []
  }
}

function saveBlocks(blocks: PlacedBlock[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(blocks))
  } catch {
    // storage unavailable — keep playing without persistence
  }
}

interface GameState {
  mode: Mode
  /** full-screen cover opacity target used by the fade between site and game */
  cover: boolean
  blocks: PlacedBlock[]
  selected: BlockKind
  enter: () => void
  exit: () => void
  select: (kind: BlockKind) => void
  place: (cells: Cell[]) => void
  remove: (cells: Cell[]) => void
  clear: () => void
}

let swapTimer: ReturnType<typeof setTimeout> | undefined
let coverTimer: ReturnType<typeof setTimeout> | undefined

export const useGame = create<GameState>((set, get) => {
  const swap = (mode: Mode) => {
    if (mode === get().mode) return
    clearTimeout(swapTimer)
    clearTimeout(coverTimer)
    set({ cover: true })
    // switch scenes only once the cover is fully opaque, then fade back in
    swapTimer = setTimeout(() => {
      set({ mode })
      if (mode === 'game') {
        scrollBridge.lock(true)
      } else {
        scrollBridge.lock(false)
        requestAnimationFrame(() => scrollBridge.toStation(PLAY_STATION))
      }
    }, 320)
    coverTimer = setTimeout(() => set({ cover: false }), 420)
  }

  return {
    mode: 'site',
    cover: false,
    blocks: loadBlocks(),
    selected: 'server',
    enter: () => swap('game'),
    exit: () => swap('site'),
    select: (kind) => set({ selected: kind }),
    place: (cells) => {
      const { blocks } = get()
      const taken = new Set(blocks.map(cellKey))
      const added: PlacedBlock[] = []
      for (const c of cells) {
        if (taken.has(cellKey(c))) continue
        taken.add(cellKey(c))
        added.push({ ...c, kind: get().selected })
      }
      if (!added.length) return
      const next = [...blocks, ...added]
      saveBlocks(next)
      set({ blocks: next })
    },
    remove: (cells) => {
      const drop = new Set(cells.map(cellKey))
      const next = get().blocks.filter((b) => !drop.has(cellKey(b)))
      if (next.length === get().blocks.length) return
      saveBlocks(next)
      set({ blocks: next })
    },
    clear: () => {
      saveBlocks([])
      set({ blocks: [] })
    },
  }
})
