import { create } from 'zustand'
import { audio } from './audio'

export interface RobotDef {
  id: string
  name: string
  x: number
  z: number
  hue: string
  /** idle facing: robots on the +z side of the path look back at it */
  face: number
}

export const ROBOTS: RobotDef[] = [
  { id: 'bima', name: 'BIMA-07', x: 3.5, z: 2.8, hue: '#35c4ff', face: Math.PI },
  { id: 'sri', name: 'SRI-11', x: 29, z: -2.6, hue: '#f2b23c', face: 0 },
  { id: 'gatot', name: 'GATOT-3', x: 55, z: 2.9, hue: '#5aa66f', face: Math.PI },
  { id: 'merak', name: 'MERAK-5', x: 81, z: -2.7, hue: '#ff5ea8', face: 0 },
  { id: 'nusa', name: 'NUSA-21', x: 107, z: 2.8, hue: '#7ea6d8', face: Math.PI },
  { id: 'komodo', name: 'KOMODO-8', x: 127, z: -2.6, hue: '#ff6b5e', face: 0 },
]

export const GREET_RADIUS = 2.4
export const GREET_MS = 4200

const NPC_KEY = 'cakrawala-npc-v1'

function loadGreeted(): string[] {
  try {
    const raw = localStorage.getItem(NPC_KEY)
    if (raw == null) return []
    const p = JSON.parse(raw)
    return Array.isArray(p)
      ? p.filter((id: unknown): id is string => ROBOTS.some((r) => r.id === id))
      : []
  } catch {
    return []
  }
}

interface RobotState {
  /** robot within greeting reach of the player, adventure mode only */
  near: string | null
  /** active greeting; seq lets the bubble replay lines on repeat greetings */
  greeting: { id: string; seq: number } | null
  greeted: string[]
  setNear: (id: string | null) => void
  greet: (id: string) => void
  clearGreet: () => void
}

export const useRobots = create<RobotState>((set, get) => ({
  near: null,
  greeting: null,
  greeted: loadGreeted(),
  setNear: (id) => {
    if (get().near !== id) set({ near: id })
  },
  greet: (id) => {
    const s = get()
    const greeted = s.greeted.includes(id) ? s.greeted : [...s.greeted, id]
    if (greeted !== s.greeted) {
      try {
        localStorage.setItem(NPC_KEY, JSON.stringify(greeted))
      } catch {
        // storage unavailable — the greeting still counts for this session
      }
    }
    set({ greeting: { id, seq: (s.greeting?.seq ?? 0) + 1 }, greeted })
    audio.greet()
  },
  clearGreet: () => set({ greeting: null }),
}))