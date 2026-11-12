import Lenis from 'lenis'
import { useEffect } from 'react'
import { clamp01, useJourney } from './store'

const SECTIONS = 11
const KEY_STEP_VH = 0.9

/**
 * Binds smooth scroll (wheel/touch) and arrow keys to one shared
 * target progress so both control the walking character.
 */
export function JourneyController() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    const setTarget = useJourney.getState().setTarget

    const progressFromScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return max > 0 ? clamp01(window.scrollY / max) : 0
    }

    const onScroll = () => setTarget(progressFromScroll())

    const scrollToProgress = (p: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      lenis.scrollTo(clamp01(p) * max, { duration: 0.6 })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const current = useJourney.getState().target
      const step = KEY_STEP_VH / SECTIONS
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToProgress(current + step)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        scrollToProgress(current - step)
      }
    }

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
      lenis.destroy()
    }
  }, [])

  return null
}
