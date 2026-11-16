import Lenis from 'lenis'
import { useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { useTribute } from '../lib/tribute'
import { scrollBridge } from './scroll'
import { STATION_COUNT } from './stations'
import { clamp01, useJourney } from './store'

/** ease with a real accel phase and decel phase (not exponential glide) */
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// long enough that the character's stride tracks the ground instead of sliding;
// short enough that checkpoint hops still feel like a gesture
const KEY_TRAVEL_S = 1.9
const WHEEL_QUIET_MS = 240
const SETTLE_MS = 200

const inGame = () => useGame.getState().mode === 'game'
// the full-screen tribute owns the wheel/keys/touch while it is open
const blocked = () => inGame() || useTribute.getState().open
// gestures on the draggable mobile 3D window belong to the window, not the journey
const fromPip = (e: Event) =>
  (e.target as HTMLElement | null)?.closest?.('[data-pip]') != null

/**
 * Binds smooth scroll (wheel/touch) and arrow keys to one shared target
 * progress so both control the walking character. Every gesture locks onto a
 * checkpoint: wheel and swipe step one station at a time in either direction,
 * and any other scroll (scrollbar, nav jump) settles on the nearest station so
 * a floating window always comes to a full, readable stop.
 */
export function JourneyController() {
  // station the arrow-key cursor is at — accumulates during key animation,
  // re-synced from the scroll position whenever the page is at rest
  const keyCursor = useRef(0)

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: false })
    const setTarget = useJourney.getState().setTarget
    keyCursor.current = useJourney.getState().activeStation

    const progressFromScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max > 0 ? clamp01(window.scrollY / max) : 0
    }

    /** the scroll position that centres a station's content */
    const stationTop = (index: number) => {
      const el = document.querySelector<HTMLElement>(`[data-station="${index + 1}"]`)
      if (!el) return null
      return el.offsetTop + (el.offsetHeight - window.innerHeight) / 2
    }

    let lockUntil = 0
    let hopStartedAt = 0
    // arrow keys pressed during a hop are queued, so the character walks each
    // checkpoint instead of the scroll leaving it behind
    let pending: number | null = null

    const scrollToStation = (index: number) => {
      const top = stationTop(index)
      if (top == null) return
      hopStartedAt = performance.now()
      lockUntil = hopStartedAt + KEY_TRAVEL_S * 1000 + 250
      lenis.scrollTo(top, {
        duration: KEY_TRAVEL_S,
        easing: easeInOutCubic,
        onComplete: () => {
          lockUntil = 0
          if (pending != null && pending !== index) {
            const next = pending
            pending = null
            scrollToStation(next)
            return
          }
          pending = null
          // a native jump (nav link, scrollbar) can land while a hop lock is
          // still active and then never re-trigger a scroll event; settle here
          // so the panel always comes to rest on a checkpoint centre
          settle()
        },
      })
    }

    let settleTimer = 0
    const lastSnap = { index: -1, y: -1 }
    // a swipe carries the same contract as a wheel gesture: at least one
    // checkpoint in its direction, and momentum is never fought backwards
    const touch = { active: false, startY: 0, station: 0, dir: 0 }

    const nearestIndex = () => {
      let best = 0
      let bestDist = Number.POSITIVE_INFINITY
      for (let i = 0; i < STATION_COUNT; i++) {
        const top = stationTop(i)
        if (top == null) continue
        const dist = Math.abs(window.scrollY - top)
        if (dist < bestDist) {
          bestDist = dist
          best = i
        }
      }
      return best
    }

    const settle = () => {
      if (blocked() || touch.active || performance.now() < lockUntil) return
      let best = nearestIndex()
      if (touch.dir !== 0) {
        const step = touch.dir > 0
          ? Math.min(touch.station + 1, STATION_COUNT - 1)
          : Math.max(touch.station - 1, 0)
        best = touch.dir > 0 ? Math.max(best, step) : Math.min(best, step)
        touch.dir = 0
      }
      keyCursor.current = best
      const top = stationTop(best)
      const bestDist = top == null ? Number.POSITIVE_INFINITY : Math.abs(window.scrollY - top)
      // Lenis lands within a few pixels of the requested centre; treat that as
      // settled so a tiny drift never restarts the animation in a loop
      if (bestDist < 32) {
        lastSnap.index = best
        lastSnap.y = window.scrollY
        return
      }
      if (best === lastSnap.index && Math.abs(window.scrollY - lastSnap.y) < 48) return
      lastSnap.index = best
      lastSnap.y = window.scrollY
      scrollToStation(best)
    }

    const onScroll = () => {
      setTarget(progressFromScroll())
      if (blocked() || lockLive(performance.now())) return
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settle, SETTLE_MS)
    }

    let wheelAccum = 0
    let lastWheelAt = 0
    // a hop whose onComplete never fires (target already reached, interrupted
    // animation) must not swallow the wheel forever: release the lock once the
    // travel window is over and Lenis is idle
    const lockLive = (now: number) => {
      if (now < lockUntil && now - hopStartedAt > KEY_TRAVEL_S * 1000 + 700 && !lenis.isScrolling) {
        lockUntil = 0
      }
      return now < lockUntil
    }
    const onWheel = (e: WheelEvent) => {
      // Lenis' own wheel listener (smoothWheel:false) calls animate.stop() on
      // every wheel event, which would kill a running checkpoint hop the moment
      // the user's next notch arrives. Own the gesture in capture phase.
      e.stopPropagation()
      if (blocked() || e.ctrlKey || e.metaKey) return
      if (fromPip(e)) {
        e.preventDefault()
        return
      }
      e.preventDefault()
      const now = performance.now()
      // swallow the rest of the gesture while a checkpoint animation runs
      if (lockLive(now)) return
      // line/page-mode mice (some drivers send 3 lines per notch) must step a
      // checkpoint too, not stay under the pixel threshold forever
      const dy =
        e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      if (now - lastWheelAt > WHEEL_QUIET_MS) wheelAccum = 0
      lastWheelAt = now
      wheelAccum += dy
      if (Math.abs(wheelAccum) < 16) return
      const dir = wheelAccum > 0 ? 1 : -1
      wheelAccum = 0
      // the cursor can drift from the real scroll position (scrollbar drag,
      // native jump, missed settle); re-anchor it before stepping
      const curTop = stationTop(keyCursor.current)
      if (curTop == null || Math.abs(window.scrollY - curTop) > 64) {
        keyCursor.current = nearestIndex()
      }
      const next = Math.min(STATION_COUNT - 1, Math.max(0, keyCursor.current + dir))
      if (next === keyCursor.current) return
      keyCursor.current = next
      scrollToStation(next)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (blocked()) return
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
      // during a hop, remember only the next checkpoint so the character always
      // walks each leg instead of the scroll racing ahead of it
      if (lockLive(performance.now())) {
        if (pending != null) return
        const queued = Math.min(STATION_COUNT - 1, Math.max(0, keyCursor.current + dir))
        if (queued !== keyCursor.current) {
          keyCursor.current = queued
          pending = queued
        }
        return
      }
      const next = Math.min(STATION_COUNT - 1, Math.max(0, keyCursor.current + dir))
      if (next === keyCursor.current) return
      keyCursor.current = next
      scrollToStation(next)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (blocked() || fromPip(e) || e.touches.length === 0) return
      touch.active = true
      touch.startY = e.touches[0].clientY
      touch.station = nearestIndex()
      touch.dir = 0
      keyCursor.current = touch.station
      // a new finger takes over from any running checkpoint hop
      lockUntil = 0
      pending = null
      window.clearTimeout(settleTimer)
      lenis.scrollTo(window.scrollY, { immediate: true, force: true })
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (blocked() || fromPip(e)) return
      touch.active = false
      const endY = e.changedTouches[0]?.clientY ?? touch.startY
      const dy = touch.startY - endY
      touch.dir = Math.abs(dy) >= 24 ? (dy > 0 ? 1 : -1) : 0
      window.clearTimeout(settleTimer)
      // momentum keeps firing scroll events; the debounce in onScroll pushes
      // this back until the glide is truly over
      settleTimer = window.setTimeout(settle, SETTLE_MS)
    }

    scrollBridge.toStation = (index) => {
      keyCursor.current = index
      // a skip of two+ stations is a teleport, not a walk: land the panel
      // instantly so the driver's beam sequence starts from the true origin
      if (Math.abs(index - nearestIndex()) >= 2) {
        const top = stationTop(index)
        if (top != null) {
          lockUntil = 0
          pending = null
          window.clearTimeout(settleTimer)
          lenis.scrollTo(top, { immediate: true, force: true })
          return
        }
      }
      scrollToStation(index)
    }
    scrollBridge.lock = (locked) => {
      if (locked) {
        lenis.stop()
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
        lenis.start()
      }
    }

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // runtime probe for QA harnesses (same spirit as __gameDebug)
    ;(window as unknown as Record<string, unknown>).__jdebug = {
      lenis,
      lock: () => lockUntil,
      hop: () => hopStartedAt,
      cursor: () => keyCursor.current,
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settleTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel, { capture: true })
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      document.body.style.overflow = ''
      scrollBridge.toStation = () => {}
      scrollBridge.lock = () => {}
      lenis.destroy()
    }
  }, [])

  return null
}
