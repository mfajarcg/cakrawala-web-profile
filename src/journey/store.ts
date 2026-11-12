import { create } from 'zustand'
import { STATION_COUNT } from './stations'

interface JourneyState {
  /** smoothed progress 0..1 driving the character position */
  progress: number
  /** raw target progress 0..1 — written by scroll and arrow keys alike */
  target: number
  /** index (0-based) of the station the character is closest to */
  activeStation: number
  /** camera mode: third-person orbit or first person */
  pov: 'follow' | 'fp'
  setTarget: (target: number) => void
  tick: (progress: number) => void
  togglePov: () => void
}

export const useJourney = create<JourneyState>((set) => ({
  progress: 0,
  target: 0,
  activeStation: 0,
  pov: 'follow',
  setTarget: (target) => set({ target: clamp01(target) }),
  togglePov: () => set((s) => ({ pov: s.pov === 'follow' ? 'fp' : 'follow' })),
  tick: (progress) =>
    set((s) => {
      const station = Math.min(
        STATION_COUNT - 1,
        Math.max(0, Math.round(progress * (STATION_COUNT - 1))),
      )
      return station === s.activeStation
        ? { progress }
        : { progress, activeStation: station }
    }),
}))

export function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}
