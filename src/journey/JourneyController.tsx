import Lenis from 'lenis'
import { useEffect, useRef } from 'react'
import { STATION_COUNT } from './stations'
import { clamp01, useJourney } from './store'

/** ease with a real accel phase and decel phase (not exponential glide) */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const KEY_TRAVEL_S = 1.15

/**
 * Binds smooth scroll (wheel/touch) and arrow keys to one shared
 * target progress so both control the walking character.
 * Arrow keys snap to the next station and land dead-centre on its panel
 * so every floating window comes to a full, readable stop.
 */
export function JourneyController() {
  // station the arrow-key cursor is at — accumulates during key animation,
  // re-synced from the character whenever the user wheels instead
  const keyCursor = useRef(0)

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    const setTarget = useJourney.getState().setTarget
    keyCursor.current = useJourney.getState().activeStation

    const progressFromScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max > 0 ? clamp01(window.scrollY / max) : 0
    }

    const onScroll = () => setTarget(progressFromScroll())

    const scrollToStation = (index: number) => {
      // data-station uses the 1-based display index (01..11)
      const el = document.querySelector<HTMLElement>(`[data-station="${index + 1}"]`)
      if (!el) return
      // centre the section's card in the viewport, whatever its height
      const top = el.offsetTop + (el.offsetHeight - window.innerHeight) / 2
      lenis.scrollTo(top, { duration: KEY_TRAVEL_S, easing: easeInOutCubic })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const dir =
        e.key === 'ArrowRight' || e.key === 'ArrowDown'
          ? 1
          : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
            ? -1
            : 0
      if (dir === 0) return
      e.preventDefault()
      const next = Math.min(STATION_COUNT - 1, Math.max(0, keyCursor.current + dir))
      if (next === keyCursor.current) return
      keyCursor.current = next
      scrollToStation(next)
    }

    // wheel/touch takes over: re-anchor the cursor at the character's station
    const onWheel = () => {
      keyCursor.current = useJourney.getState().activeStation
    }

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
      lenis.destroy()
    }
  }, [])

  return null
}
