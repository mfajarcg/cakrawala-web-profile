import { create } from 'zustand'
import { STATIONS } from '../journey/stations'
import { scrollBridge } from '../journey/scroll'
import { adventureSpawn, characterPos, teleport } from '../three/shared'
import { audio } from './audio'
import { addScore, bestTime, TIME_LIMIT, type Difficulty } from './leaderboard'
import { cascade, isSupported, NOTICE_KEYS, scanMeaning, type NoticeKey } from './meaning'

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
const MEANING_KEY = 'cakrawala-meaning-v1'
const RUN_KEY = 'cakrawala-run-v1'

export type RunGate = 'none' | 'entry' | 'difficulty' | 'timeout'

export interface RunResult {
  time: number
  difficulty: Difficulty
  record: boolean
  saved: boolean
}

interface RunMeta {
  difficulty: Difficulty | null
  remaining: number
  finished: boolean
}

function loadRun(): RunMeta {
  const fallback: RunMeta = { difficulty: null, remaining: 0, finished: false }
  try {
    const raw = localStorage.getItem(RUN_KEY)
    if (raw == null) return fallback
    const p = JSON.parse(raw)
    const difficulty = (['easy', 'medium', 'hard', 'epic'] as const).includes(p?.difficulty)
      ? (p.difficulty as Difficulty)
      : null
    return {
      difficulty,
      remaining:
        typeof p?.remaining === 'number' && Number.isFinite(p.remaining) && p.remaining >= 0
          ? p.remaining
          : 0,
      finished: p?.finished === true,
    }
  } catch {
    return fallback
  }
}

interface MeaningMeta {
  best: number
  done: boolean
  vista: boolean
  unlocked: NoticeKey[]
}

function loadMeta(): MeaningMeta {
  const fallback: MeaningMeta = { best: 0, done: false, vista: false, unlocked: [] }
  try {
    const raw = localStorage.getItem(MEANING_KEY)
    if (raw == null) return fallback
    const p = JSON.parse(raw)
    return {
      best: Number.isInteger(p?.best) && p.best >= 0 ? p.best : 0,
      done: p?.done === true,
      vista: p?.vista === true,
      unlocked: Array.isArray(p?.unlocked)
        ? p.unlocked.filter((k: unknown): k is NoticeKey => NOTICE_KEYS.includes(k as NoticeKey))
        : [],
    }
  } catch {
    return fallback
  }
}

function saveMeta(m: MeaningMeta) {
  try {
    localStorage.setItem(MEANING_KEY, JSON.stringify(m))
  } catch {
    // storage unavailable — meaning stays in memory for this session
  }
}

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
  /** free-roam Jakarta 2045: whole world walkable, no build, no clock */
  adventure: boolean
  /** full-screen cover opacity target used by the fade between site and game */
  cover: boolean
  /** true while the pause menu holds the cursor, so the loop freezes */
  paused: boolean
  blocks: PlacedBlock[]
  selected: BlockKind
  /** longest ground-up ordered layer run, 0..5 — the structure's meaning */
  progress: number
  /** cells of that run, for the beacon; null when no ordered run exists */
  column: Cell[] | null
  /** tallest column in the arena */
  height: number
  /** persisted record height */
  best: number
  /** persisted: a meaningful stack has been completed at least once */
  done: boolean
  /** transient completion card */
  celebrate: boolean
  /** persisted: the horizon has been opened (dawn light stays) */
  vista: boolean
  /** persisted collection of aphorisms, shown as Renungan in the pause menu */
  unlocked: NoticeKey[]
  /** transient aphorism toast; seq lets the HUD replay identical keys */
  notice: { key: NoticeKey; seq: number } | null
  /** which run modal holds the game: entry choice, difficulty pick, timeout */
  gate: RunGate
  /** active timed challenge, null for free build */
  difficulty: Difficulty | null
  /** seconds left on the challenge clock; held while paused / away */
  remaining: number
  /** the current challenge has been completed (clock frozen) */
  finished: boolean
  /** transient win card awaiting a name / next action */
  result: RunResult | null
  enter: () => void
  enterAdventure: () => void
  jumpStation: (index: number) => void
  exit: () => void
  setPaused: (paused: boolean) => void
  select: (kind: BlockKind) => void
  place: (cells: Cell[]) => void
  remove: (cells: Cell[]) => void
  clear: () => void
  dismissCelebrate: () => void
  openVista: () => void
  continueRun: () => void
  startFresh: () => void
  chooseDifficulty: (d: Difficulty) => void
  tickRun: (dt: number) => void
  restartAfterTimeout: () => void
  saveResult: (name: string) => void
  dismissResult: () => void
}

/** the clock only advances while actually playing: not paused, no modal, mid-run */
export function runTicking(s: GameState): boolean {
  return (
    s.mode === 'game' &&
    !s.adventure &&
    !s.paused &&
    s.gate === 'none' &&
    !s.result &&
    !s.celebrate &&
    s.difficulty != null &&
    !s.finished &&
    s.remaining > 0
  )
}

let swapTimer: ReturnType<typeof setTimeout> | undefined
let coverTimer: ReturnType<typeof setTimeout> | undefined

export const useGame = create<GameState>((set, get) => {
  const swap = (mode: Mode, adventure = false) => {
    if (mode === get().mode && adventure === get().adventure) return
    clearTimeout(swapTimer)
    clearTimeout(coverTimer)
    set({ cover: true })
    // switch scenes only once the cover is fully opaque, then fade back in
    swapTimer = setTimeout(() => {
      if (mode === 'game') {
        set({
          mode,
          paused: false,
          gate: adventure ? 'none' : 'entry',
          result: null,
          celebrate: false,
          adventure,
        })
        if (adventure) {
          // free roam starts exactly where the journey left the character
          teleport.t = -1
          adventureSpawn.x = characterPos.current.x
          adventureSpawn.z = characterPos.current.z
          adventureSpawn.beam = false
        }
        scrollBridge.lock(true)
      } else {
        const back = get().adventure ? nearestStation() : PLAY_STATION
        set({ mode, paused: false, gate: 'none', result: null, celebrate: false, adventure: false })
        saveRun()
        scrollBridge.lock(false)
        requestAnimationFrame(() => scrollBridge.toStation(back))
      }
    }, 320)
    coverTimer = setTimeout(() => set({ cover: false }), 420)
  }

  const nearestStation = () => {
    let best = 0
    let bestD = Infinity
    STATIONS.forEach((s, i) => {
      const d = Math.abs(s.x - characterPos.current.x)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  const meta = loadMeta()
  const runMeta = loadRun()
  let noticeSeq = 0

  const persist = () => {
    const { best, done, vista, unlocked } = get()
    saveMeta({ best, done, vista, unlocked })
  }

  const saveRun = () => {
    const { difficulty, remaining, finished } = get()
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({ difficulty, remaining, finished }))
    } catch {
      // storage unavailable — the run lives in memory for this session
    }
  }

  const say = (key: NoticeKey) => {
    noticeSeq += 1
    set({ notice: { key, seq: noticeSeq } })
  }

  const unlock = (key: NoticeKey) => {
    const { unlocked } = get()
    if (unlocked.includes(key)) return false
    set({ unlocked: [...unlocked, key] })
    persist()
    return true
  }

  /** recompute meaning after any structural change and fire its milestones */
  const rescan = (before: number) => {
    const { blocks, best } = get()
    const scan = scanMeaning(blocks)
    const height = scan.height
    const nextBest = Math.max(best, height)
    set({ progress: scan.progress, column: scan.column, height, best: nextBest })
    if (nextBest !== best) persist()
    if (scan.progress >= 2 && before < 2) {
      if (unlock('pair')) say('pair')
    }
    if (scan.progress === 5) {
      const st = get()
      if (st.difficulty != null && !st.finished) {
        // a timed challenge was completed: freeze the clock and open the win card
        const elapsed = Math.max(0.1, TIME_LIMIT[st.difficulty] - st.remaining)
        const best = bestTime()
        const record = best == null || elapsed < best
        set({
          done: true,
          vista: true,
          finished: true,
          result: { time: elapsed, difficulty: st.difficulty, record, saved: false },
        })
        unlock('complete')
        unlock('vista')
        persist()
        say('complete')
        audio.complete()
        if (record) audio.record()
        saveRun()
      } else if (!st.done) {
        set({ done: true, vista: true, celebrate: true })
        unlock('complete')
        unlock('vista')
        persist()
        say('complete')
        audio.complete()
      }
    }
  }

  return {
    mode: 'site',
    adventure: false,
    cover: false,
    paused: false,
    blocks: loadBlocks(),
    selected: 'server',
    progress: 0,
    column: null,
    height: 0,
    best: meta.best,
    done: meta.done,
    celebrate: false,
    vista: meta.vista,
    unlocked: meta.unlocked,
    notice: null,
    gate: 'none',
    difficulty: runMeta.difficulty,
    remaining: runMeta.remaining,
    finished: runMeta.finished,
    result: null,
    enter: () => swap('game'),
    enterAdventure: () => swap('game', true),
    jumpStation: (index) => {
      const s = STATIONS[index]
      if (!s || !get().adventure) return
      adventureSpawn.x = s.x
      adventureSpawn.z = s.z + 1.6
      adventureSpawn.beam = true
      audio.teleport()
    },
    exit: () => swap('site'),
    setPaused: (paused) => {
      set({ paused })
      if (paused) saveRun()
    },
    select: (kind) => set({ selected: kind }),
    place: (cells) => {
      const { blocks } = get()
      const taken = new Set(blocks.map(cellKey))
      const added: PlacedBlock[] = []
      for (const c of cells) {
        if (taken.has(cellKey(c))) continue
        // the foundation law: an idea without support does not stand
        if (!isSupported(c, taken)) {
          unlock('reject')
          say('reject')
          audio.deny()
          return
        }
        taken.add(cellKey(c))
        added.push({ ...c, kind: get().selected })
      }
      if (!added.length) return
      const wasEmpty = blocks.length === 0
      const before = get().progress
      const next = [...blocks, ...added]
      saveBlocks(next)
      set({ blocks: next })
      audio.place()
      if (wasEmpty && unlock('first')) say('first')
      rescan(before)
    },
    remove: (cells) => {
      const drop = new Set(cells.map(cellKey))
      const blocks = get().blocks
      const direct = blocks.filter((b) => drop.has(cellKey(b))).length
      if (!direct) return
      const { kept } = cascade(blocks, drop)
      const fell = blocks.length - kept.length - direct
      const before = get().progress
      saveBlocks(kept)
      set({ blocks: kept })
      if (fell > 0) {
        unlock('collapse')
        say('collapse')
        audio.collapse()
      } else {
        audio.break()
      }
      rescan(before)
    },
    clear: () => {
      saveBlocks([])
      set({ blocks: [], celebrate: false })
      audio.break()
      rescan(get().progress)
    },
    dismissCelebrate: () => set({ celebrate: false }),
    openVista: () => {
      if (get().vista) return
      set({ vista: true })
      unlock('vista')
      say('vista')
      audio.vista()
    },
    continueRun: () => set({ gate: 'none' }),
    startFresh: () => set({ gate: 'difficulty' }),
    chooseDifficulty: (d) => {
      saveBlocks([])
      set({
        blocks: [],
        celebrate: false,
        result: null,
        finished: false,
        difficulty: d,
        remaining: TIME_LIMIT[d],
        gate: 'none',
      })
      saveRun()
      rescan(get().progress)
      audio.place()
    },
    tickRun: (dt) => {
      const s = get()
      if (!runTicking(s)) return
      const prevCeil = Math.ceil(s.remaining)
      const remaining = Math.max(0, s.remaining - dt)
      if (remaining <= 0) {
        set({ remaining: 0, gate: 'timeout' })
        saveRun()
        audio.timeout()
        return
      }
      set({ remaining })
      const ceil = Math.ceil(remaining)
      if (ceil !== prevCeil) {
        saveRun()
        if (ceil <= 5) audio.timeWarn()
      }
    },
    restartAfterTimeout: () => {
      const d = get().difficulty
      if (!d) {
        set({ gate: 'none' })
        return
      }
      saveBlocks([])
      set({
        blocks: [],
        remaining: TIME_LIMIT[d],
        finished: false,
        result: null,
        celebrate: false,
        gate: 'none',
      })
      saveRun()
      rescan(get().progress)
    },
    saveResult: (name) => {
      const r = get().result
      const clean = name.trim().slice(0, 24)
      if (!r || r.saved || !clean) return
      addScore({ name: clean, time: r.time, difficulty: r.difficulty, at: Date.now() })
      set({ result: { ...r, saved: true } })
      audio.place()
    },
    dismissResult: () => set({ result: null }),
  }
})

// the opening structure already carries a foundation: reflect it on first load
{
  const s = useGame.getState()
  const scan = scanMeaning(s.blocks)
  useGame.setState({ progress: scan.progress, column: scan.column, height: scan.height })
}

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__gameStore = useGame
}
