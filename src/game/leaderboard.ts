/**
 * The playground's score book. Times are durable records keyed by the player's
 * chosen name; the fastest completion is the high score. Persistence is the
 * browser's own store so the board survives sessions on a static host.
 */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'epic']

/** countdown budget per difficulty, in seconds */
export const TIME_LIMIT: Record<Difficulty, number> = {
  easy: 600,
  medium: 300,
  hard: 120,
  epic: 30,
}

export interface ScoreEntry {
  name: string
  time: number
  difficulty: Difficulty
  at: number
}

const KEY = 'cakrawala-scores-v1'
const MAX_ENTRIES = 50

function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v)
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw == null) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: ScoreEntry[] = []
    for (const e of parsed) {
      if (!e || typeof e.name !== 'string') continue
      if (typeof e.time !== 'number' || !Number.isFinite(e.time) || e.time <= 0) continue
      if (!isDifficulty(e.difficulty)) continue
      out.push({
        name: e.name.slice(0, 24),
        time: e.time,
        difficulty: e.difficulty,
        at: typeof e.at === 'number' ? e.at : 0,
      })
    }
    return out.sort((a, b) => a.time - b.time)
  } catch {
    return []
  }
}

function saveScores(entries: ScoreEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage unavailable — the board lives in memory for this session
  }
}

export function bestTime(): number | null {
  const scores = loadScores()
  return scores.length ? scores[0].time : null
}

export function addScore(entry: ScoreEntry): ScoreEntry[] {
  const next = [...loadScores(), entry].sort((a, b) => a.time - b.time).slice(0, MAX_ENTRIES)
  saveScores(next)
  return next
}

/** m:ss for the live countdown */
export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** m:ss.t for recorded times */
export function fmtTime(sec: number): string {
  const tenths = Math.max(0, Math.round(sec * 10))
  const m = Math.floor(tenths / 600)
  const s = Math.floor((tenths % 600) / 10)
  const d = tenths % 10
  return `${m}:${String(s).padStart(2, '0')}.${d}`
}