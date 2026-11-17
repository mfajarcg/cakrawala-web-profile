import { create } from 'zustand'

const KEY = 'cakrawala-theme-v1'

function initialNight(): boolean {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'day') return false
    if (saved === 'night') return true
  } catch {
    // storage unavailable — fall through to the default
  }
  return true // the city opens after dark
}

interface ThemeState {
  night: boolean
  toggle: () => void
}

export const useTheme = create<ThemeState>((set) => ({
  night: initialNight(),
  toggle: () =>
    set((s) => {
      const night = !s.night
      try {
        localStorage.setItem(KEY, night ? 'night' : 'day')
      } catch {
        // ignore
      }
      return { night }
    }),
}))

/** reflect the theme on <html> so every CSS surface follows one source */
export function applyTheme(night: boolean) {
  const root = document.documentElement
  root.dataset.theme = night ? 'night' : 'day'
  root.style.colorScheme = night ? 'dark' : 'light'
}

// paint before first render so a night-default load never flashes day
applyTheme(useTheme.getState().night)