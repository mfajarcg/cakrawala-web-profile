import {
  ChevronDown,
  ChevronUp,
  Keyboard,
  LogOut,
  Play,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useI18n } from '../lib/i18n'
import { audio } from './audio'
import { emitAim, input, lockState, resetInput, setTapAim, subscribeAim } from './input'
import { LAYERS, LAYER_ROMAN, NOTICE_KEYS } from './meaning'
import { RunPanels, RunTimer, ScoreBoard } from './RunPanels'
import { BLOCK_COLORS, BLOCK_KINDS, useGame, type BlockKind } from './store'

const DECK_KEY = 'cakrawala-hud-deck-v1'

/**
 * Fires on pointerdown so the control still works if a pointer lock is ever
 * active (locked browsers retarget click, but not pointer events); keyboard
 * activation arrives as a click with detail 0.
 */
function press(fn: () => void) {
  return {
    onPointerDown: (e: ReactPointerEvent) => {
      e.preventDefault()
      fn()
    },
    onClick: (e: ReactMouseEvent) => {
      if (e.detail === 0) fn()
    },
  }
}

function usePointerLocked() {
  const [locked, setLocked] = useState(
    () => typeof document !== 'undefined' && document.pointerLockElement != null,
  )
  useEffect(() => {
    const update = () => setLocked(document.pointerLockElement != null)
    document.addEventListener('pointerlockchange', update)
    return () => document.removeEventListener('pointerlockchange', update)
  }, [])
  return locked
}

export function GameHud() {
  const { t } = useI18n()
  const selected = useGame((s) => s.selected)
  const select = useGame((s) => s.select)
  const exit = useGame((s) => s.exit)
  const clear = useGame((s) => s.clear)
  const count = useGame((s) => s.blocks.length)
  const progress = useGame((s) => s.progress)
  const height = useGame((s) => s.height)
  const best = useGame((s) => s.best)
  const celebrate = useGame((s) => s.celebrate)
  const paused = useGame((s) => s.paused)
  const setPaused = useGame((s) => s.setPaused)
  const gate = useGame((s) => s.gate)
  const result = useGame((s) => s.result)
  const locked = usePointerLocked()
  const muted = useSyncExternalStore(audio.subscribe, () => audio.muted)
  const pointAim = useSyncExternalStore(subscribeAim, () => input.pointAim)
  const [touch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )
  const [confirmClear, setConfirmClear] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [deckOpen, setDeckOpen] = useState(() => {
    try {
      return localStorage.getItem(DECK_KEY) !== 'closed'
    } catch {
      return true
    }
  })
  const resumeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = useGame.getState()
      if (st.paused || st.celebrate || st.gate !== 'none' || st.result) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          input.forward = 1
          e.preventDefault()
          break
        case 'KeyS':
        case 'ArrowDown':
          input.forward = -1
          e.preventDefault()
          break
        case 'KeyA':
        case 'ArrowLeft':
          input.strafe = -1
          e.preventDefault()
          break
        case 'KeyD':
        case 'ArrowRight':
          input.strafe = 1
          e.preventDefault()
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          input.run = true
          break
        case 'Space':
          input.jumpQueued = true
          e.preventDefault()
          break
        default: {
          const digit = Number(e.key)
          if (digit >= 1 && digit <= BLOCK_KINDS.length) {
            const kind = BLOCK_KINDS[digit - 1]
            if (kind) select(kind)
          }
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (input.forward > 0) input.forward = 0
          break
        case 'KeyS':
        case 'ArrowDown':
          if (input.forward < 0) input.forward = 0
          break
        case 'KeyA':
        case 'ArrowLeft':
          if (input.strafe < 0) input.strafe = 0
          break
        case 'KeyD':
        case 'ArrowRight':
          if (input.strafe > 0) input.strafe = 0
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          input.run = false
          break
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      resetInput()
    }
  }, [select])

  // escape is handled outside the movement keys: stage one releases the lock
  // (which opens the pause menu), stage two leaves the playground
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return
      const state = useGame.getState()
      if (showScores) {
        e.preventDefault()
        setShowScores(false)
        return
      }
      if (state.result) {
        e.preventDefault()
        state.dismissResult()
        return
      }
      if (state.gate === 'timeout') {
        e.preventDefault()
        return
      }
      if (state.gate === 'entry' || state.gate === 'difficulty') {
        e.preventDefault()
        state.exit()
        return
      }
      if (state.celebrate) {
        e.preventDefault()
        state.dismissCelebrate()
        return
      }
      if (document.pointerLockElement) {
        e.preventDefault()
        state.setPaused(true)
        lockState.lastLostAt = performance.now()
        resetInput()
        document.exitPointerLock()
        return
      }
      // the same Esc that just closed the lock must not also exit
      if (performance.now() - lockState.lastLostAt < 300) return
      if (confirmClear) {
        setConfirmClear(false)
        return
      }
      state.exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmClear, showScores])

  useEffect(() => {
    if (!confirmClear) return
    const id = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(id)
  }, [confirmClear])

  useEffect(() => {
    if (!paused) setConfirmClear(false)
    else resumeRef.current?.focus()
  }, [paused])

  // the completion card needs a free cursor; releasing the lock must not pause
  useEffect(() => {
    if (celebrate && document.pointerLockElement) document.exitPointerLock()
  }, [celebrate])

  // run modals (entry / difficulty / timeout / win) also need a free cursor
  useEffect(() => {
    if ((gate !== 'none' || result) && document.pointerLockElement) document.exitPointerLock()
  }, [gate, result])

  // the challenge clock: runTicking gates it to actual play, so pause / exit /
  // modals hold the remaining time instead of burning it
  useEffect(() => {
    const id = window.setInterval(() => useGame.getState().tickRun(0.1), 100)
    return () => window.clearInterval(id)
  }, [])

  // a stray lock on a touch device would steal every HUD click — drop it
  useEffect(() => {
    if (touch && document.pointerLockElement) document.exitPointerLock()
  }, [touch, locked])

  const openMenu = () => {
    resetInput()
    setPaused(true)
  }

  const resume = () => {
    setPaused(false)
    resetInput()
    lockState.lastLostAt = 0
    // touch aims by tapping; locking would hide the cursor and eat HUD clicks
    if (touch) return
    const canvas = document.querySelector<HTMLCanvasElement>('canvas')
    try {
      const result = canvas?.requestPointerLock?.() as unknown
      if (result && typeof (result as Promise<void>).catch === 'function') {
        ;(result as Promise<void>).catch(() => {
          input.freeAim = true
        })
      }
    } catch {
      input.freeAim = true
    }
  }

  const toggleDeck = () => {
    setDeckOpen((open) => {
      const next = !open
      try {
        localStorage.setItem(DECK_KEY, next ? 'open' : 'closed')
      } catch {
        // storage unavailable — the deck simply keeps its in-memory state
      }
      return next
    })
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none text-white">
      {/* top bar */}
      <div data-topbar className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="rounded-xl border border-white/10 bg-[#101418]/85 px-4 py-2 shadow-lg backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f2b23c]">
            {t.play.gameTitle}
          </p>
          <p className="mt-0.5 text-[0.65rem] font-semibold text-white/55">
            {t.play.saved}: {count}
          </p>
          <p className="mt-2 text-[0.55rem] font-black uppercase tracking-[0.22em] text-white/45">
            {t.play.meaning.objective}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {LAYERS.map((kind, i) => (
              <span
                key={kind}
                title={`${LAYER_ROMAN[i]} · ${t.play.meaning.layers[kind]}`}
                className={`flex h-5 w-5 items-center justify-center rounded-md border text-[0.55rem] font-black transition ${
                  i < progress
                    ? 'border-[#f2b23c]/70 bg-[#f2b23c]/25 text-[#f2b23c]'
                    : 'border-white/15 bg-white/5 text-white/35'
                }`}
              >
                {LAYER_ROMAN[i]}
              </span>
            ))}
            <span className="ml-1 text-[0.6rem] font-bold text-white/60">
              {t.play.meaning.ladder} {progress}/5
            </span>
          </div>
          {progress < 5 && (
            <p className="mt-1 text-[0.6rem] font-semibold text-[#f2b23c]/85">
              {t.play.meaning.next}: {LAYER_ROMAN[progress]} · {t.play.meaning.layers[LAYERS[progress]]}
            </p>
          )}
          <p className="mt-1 text-[0.6rem] font-semibold text-white/45">
            {t.play.score}: {height} · {t.play.best}: {best}
          </p>
          <RunTimer />
        </div>

        <div className="flex items-center gap-2">
          <button
            {...press(() => audio.toggle())}
            aria-label={muted ? t.play.meaning.soundOff : t.play.meaning.soundOn}
            title={muted ? t.play.meaning.soundOff : t.play.meaning.soundOn}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-[#101418]/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-[#101418] focus-visible:outline-2 focus-visible:outline-white/70"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            {...press(() => setShowScores((v) => !v))}
            aria-label={t.play.run.boardTitle}
            title={t.play.run.boardTitle}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-[#101418]/85 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-[#101418] focus-visible:outline-2 focus-visible:outline-white/70"
          >
            <Trophy size={14} />
          </button>
          {locked && !touch ? (
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#101418]/85 px-3 py-1.5 text-[0.65rem] font-bold text-white/70 shadow-lg backdrop-blur">
              <Key danger>Esc</Key>
              {t.play.menu}
            </div>
          ) : (
            <button
              {...press(openMenu)}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-[#101418]/85 px-3.5 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-[#101418] focus-visible:outline-2 focus-visible:outline-white/70"
            >
              <Keyboard size={14} />
              {t.play.menu}
            </button>
          )}
        </div>
      </div>

      {/* crosshair — centre for lock/cursor aim; touch shows a reticle at the tap */}
      {!paused && !(touch && pointAim) && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-4 w-4 rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(16,20,24,0.35)]" />
        </div>
      )}
      {!paused && touch && pointAim && (
        <div
          data-reticle
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pointAim.x, top: pointAim.y }}
        >
          <div className="h-7 w-7 rounded-full border-2 border-[#f2b23c] shadow-[0_0_0_1px_rgba(16,20,24,0.45),0_0_14px_rgba(242,178,60,0.55)]" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f2b23c]" />
        </div>
      )}
      {touch && !pointAim && !paused && (
        <div
          data-touch-hint
          className="pointer-events-none absolute inset-x-0 top-[57%] flex justify-center px-6"
        >
          <p className="max-w-[20rem] rounded-full border border-white/15 bg-[#101418]/80 px-4 py-1.5 text-center text-[0.65rem] font-semibold text-white/80 backdrop-blur">
            {t.play.touchHint}
          </p>
        </div>
      )}

      {/* hotbar — desktop: bottom centre */}
      {!touch && (
        <div data-hotbar="desktop" className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-1.5 px-4">
          <p className="rounded-full bg-[#101418]/70 px-3 py-1 text-[0.65rem] font-bold text-white/85 backdrop-blur">
            {LAYER_ROMAN[BLOCK_KINDS.indexOf(selected)]} · {t.play.meaning.layers[selected]} —{' '}
            {t.play.blocks.find((b) => b.kind === selected)?.label ?? selected}
          </p>
          <div className="pointer-events-auto flex items-end gap-1.5 rounded-2xl bg-[#101418]/80 p-2 backdrop-blur">
            {BLOCK_KINDS.map((kind, i) => (
              <HotbarSlot
                key={kind}
                kind={kind}
                i={i}
                active={selected === kind}
                onSelect={() => select(kind)}
                touch={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* hotbar — touch: left vertical strip, clear of the joystick and actions */}
      {touch && (
        <div data-hotbar="touch" className="pointer-events-auto absolute bottom-44 left-2 flex flex-col items-start gap-1.5">
          <p className="max-w-[11rem] truncate rounded-full bg-[#101418]/70 px-3 py-1 text-[0.65rem] font-bold text-white/85 backdrop-blur">
            {LAYER_ROMAN[BLOCK_KINDS.indexOf(selected)]} · {t.play.meaning.layers[selected]} —{' '}
            {t.play.blocks.find((b) => b.kind === selected)?.label ?? selected}
          </p>
          <div className="flex flex-col gap-1 rounded-2xl bg-[#101418]/80 p-1.5 backdrop-blur">
            {BLOCK_KINDS.map((kind, i) => (
              <HotbarSlot
                key={kind}
                kind={kind}
                i={i}
                active={selected === kind}
                onSelect={() => select(kind)}
                touch
              />
            ))}
          </div>
        </div>
      )}

      <NoticeToast />
      <CelebratePanel />
      <RunPanels />
      <ScoreBoard open={showScores} onClose={() => setShowScores(false)} />

      {!touch && <ControlDeck open={deckOpen} onToggle={toggleDeck} />}
      {touch && <TouchControls />}

      {paused && (
        <PausePanel
          t={t}
          count={count}
          confirmClear={confirmClear}
          resumeRef={resumeRef}
          onResume={resume}
          onAskClear={() => setConfirmClear(true)}
          onCancelClear={() => setConfirmClear(false)}
          onClear={() => {
            clear()
            setConfirmClear(false)
          }}
          onExit={exit}
        />
      )}
    </div>
  )
}

function HotbarSlot({
  kind,
  i,
  active,
  onSelect,
  touch,
}: {
  kind: BlockKind
  i: number
  active: boolean
  onSelect: () => void
  touch: boolean
}) {
  const { t } = useI18n()
  const label = t.play.blocks.find((b) => b.kind === kind)?.label ?? kind
  return (
    <button
      {...press(onSelect)}
      title={`${i + 1} · ${LAYER_ROMAN[i]} ${t.play.meaning.layers[kind]} · ${label}`}
      aria-label={`${LAYER_ROMAN[i]} ${t.play.meaning.layers[kind]} · ${label}`}
      aria-pressed={active}
      className={
        touch
          ? `flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
              active ? 'bg-white/20' : 'active:bg-white/10'
            }`
          : `flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition ${
              active ? 'bg-white/20' : 'hover:bg-white/10'
            }`
      }
    >
      <span
        className="relative h-7 w-7 rounded-md border-2 border-white/30"
        style={{ backgroundColor: BLOCK_COLORS[kind] }}
      >
        <span className="absolute -right-2 -top-2 rounded bg-[#101418] px-0.5 text-[0.5rem] font-black text-[#f2b23c]">
          {LAYER_ROMAN[i]}
        </span>
      </span>
      <span className="text-[0.55rem] font-bold leading-none text-white/70">{i + 1}</span>
    </button>
  )
}

function NoticeToast() {
  const { t } = useI18n()
  const notice = useGame((s) => s.notice)
  const [visible, setVisible] = useState(false)
  const [touch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    if (!notice) return
    setVisible(true)
    const id = window.setTimeout(() => setVisible(false), 5200)
    return () => window.clearTimeout(id)
  }, [notice])

  if (!notice || !visible) return null
  const n = t.play.meaning.notices[notice.key]
  return (
    <div
      key={notice.seq}
      className={`notice-toast pointer-events-none absolute inset-x-0 ${
        touch ? 'top-40' : 'bottom-32'
      } flex justify-center px-4`}
    >
      <div className="max-w-[26rem] rounded-2xl border border-[#f2b23c]/35 bg-[#101418]/90 px-5 py-3 text-center shadow-[0_1rem_2.5rem_rgba(0,0,0,0.4)] backdrop-blur-md">
        <p className="flex items-center justify-center gap-2 text-[0.6rem] font-black uppercase tracking-[0.28em] text-[#f2b23c]">
          <Sparkles size={12} />
          {n.title}
        </p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-white/85">{n.body}</p>
      </div>
    </div>
  )
}

function CelebratePanel() {
  const { t } = useI18n()
  const celebrate = useGame((s) => s.celebrate)
  const dismiss = useGame((s) => s.dismissCelebrate)
  const exit = useGame((s) => s.exit)
  if (!celebrate) return null
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-[#0b1216]/55 p-4 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meaning-title"
        className="w-full max-w-[30rem] rounded-2xl border border-[#f2b23c]/40 bg-[#101418]/95 p-6 shadow-[0_2rem_5rem_rgba(0,0,0,0.5)]"
      >
        <p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
          {t.play.meaning.objective}
        </p>
        <h2 id="meaning-title" className="mt-1 text-3xl font-black tracking-tight text-white">
          {t.play.meaning.completeTitle}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/70">{t.play.meaning.completeBody}</p>
        <ol className="mt-4 grid grid-cols-5 gap-1.5">
          {LAYERS.map((kind, i) => (
            <li
              key={kind}
              className="rounded-lg border border-[#f2b23c]/30 bg-[#f2b23c]/10 px-1 py-2 text-center"
            >
              <span className="block text-[0.55rem] font-black text-[#f2b23c]">
                {LAYER_ROMAN[i]}
              </span>
              <span className="mt-0.5 block text-[0.6rem] font-bold text-white/80">
                {t.play.meaning.layers[kind]}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={dismiss}
            className="flex-1 rounded-xl bg-[#f2b23c] px-4 py-3 text-sm font-black text-[#101418] shadow-lg transition hover:bg-[#e0a22c] focus-visible:outline-2 focus-visible:outline-white"
          >
            {t.play.meaning.continue}
          </button>
          <button
            onClick={exit}
            className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/70"
          >
            {t.play.exit}
          </button>
        </div>
      </div>
    </div>
  )
}

function Key({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return <kbd className={`keycap ${danger ? 'keycap-danger' : ''}`}>{children}</kbd>
}

function ControlDeck({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t } = useI18n()

  if (!open) {
    return (
      <div className="pointer-events-auto absolute bottom-5 left-4 hidden lg:block">
        <button
          {...press(onToggle)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-[#101418]/85 px-3 py-2 text-[0.65rem] font-bold text-white/70 shadow-lg backdrop-blur transition hover:bg-[#101418] hover:text-white"
        >
          <Key danger>Esc</Key>
          {t.play.deckTitle}
          <ChevronUp size={13} className="text-white/45" />
        </button>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto absolute bottom-5 left-4 hidden w-[21rem] lg:block">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101418]/88 shadow-[0_1.5rem_3rem_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#408fb4] via-[#f2b23c] to-transparent" />
        <div className="flex items-center justify-between px-4 pt-3">
          <p className="flex items-center gap-2 text-[0.58rem] font-black uppercase tracking-[0.28em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f2b23c]" />
            {t.play.deckTitle}
          </p>
          <button
            {...press(onToggle)}
            aria-label={t.play.deckTitle}
            className="rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 pt-2">
          <section>
            <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/40">
              {t.play.deckMove}
            </p>
            <div className="mt-1.5 flex items-end gap-2">
              <div className="grid grid-cols-3 grid-rows-2 gap-1">
                <div className="col-start-2">
                  <Key>W</Key>
                </div>
                <div className="col-start-1 row-start-2">
                  <Key>A</Key>
                </div>
                <div className="col-start-2 row-start-2">
                  <Key>S</Key>
                </div>
                <div className="col-start-3 row-start-2">
                  <Key>D</Key>
                </div>
              </div>
              <div className="pb-0.5">
                <Key>Shift</Key>
                <p className="mt-1 text-[0.6rem] font-semibold text-white/45">
                  {t.play.deckRun}
                </p>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/40">
              {t.play.deckAction}
            </p>
            <ActionRow label={t.play.deckJump}>
              <Key>Space</Key>
            </ActionRow>
            <ActionRow label={t.play.deckBreak}>
              <Key>{t.play.mouseLeft}</Key>
            </ActionRow>
            <ActionRow label={t.play.deckPlace}>
              <Key>{t.play.mouseRight}</Key>
            </ActionRow>
          </section>

          <section className="col-span-2 grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/40">
                {t.play.deckSystem}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Key>1</Key>
                <span className="text-white/30">–</span>
                <Key>5</Key>
                <span className="text-[0.6rem] font-semibold text-white/45">
                  {t.play.deckPick}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[0.55rem] font-black uppercase tracking-[0.18em] text-white/40">
                {t.play.deckEscTitle}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Key danger>Esc</Key>
                <span className="text-[0.6rem] font-semibold text-white/60">
                  {t.play.deckEsc}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-white/10 bg-[#0b1216]/60 px-4 py-2 text-[0.62rem] font-bold text-white/55">
          {t.play.escHint}
        </div>
      </div>
    </div>
  )
}

function ActionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 whitespace-nowrap">
      {children}
      <span className="text-[0.6rem] font-semibold text-white/60">{label}</span>
    </div>
  )
}

interface PausePanelProps {
  t: ReturnType<typeof useI18n>['t']
  count: number
  confirmClear: boolean
  resumeRef: RefObject<HTMLButtonElement | null>
  onResume: () => void
  onAskClear: () => void
  onCancelClear: () => void
  onClear: () => void
  onExit: () => void
}

function PausePanel({
  t,
  count,
  confirmClear,
  resumeRef,
  onResume,
  onAskClear,
  onCancelClear,
  onClear,
  onExit,
}: PausePanelProps) {
  const card = useRef<HTMLDivElement>(null)
  const unlocked = useGame((s) => s.unlocked)

  const trap = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const nodes = card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    if (!nodes || nodes.length === 0) return
    const list = [...nodes]
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-[#0b1216]/60 p-4 backdrop-blur-[2px]">
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        onKeyDown={trap}
        data-lenis-prevent
        className="renungan-scroll max-h-[86vh] w-full max-w-[26rem] overflow-y-auto rounded-2xl border border-white/10 bg-[#101418]/95 p-6 shadow-[0_2rem_5rem_rgba(0,0,0,0.45)]"
      >
        <p className="text-[0.58rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
          Paused
        </p>
        <h2 id="pause-title" className="mt-1 text-2xl font-black tracking-tight">
          {t.play.pauseTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{t.play.pauseLead}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <span className="font-semibold text-white/55">{t.play.saved}</span>
          <span className="font-black text-white">{count}</span>
        </div>

        <div className="mt-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.28em] text-white/50">
            {t.play.meaning.renungan}
          </p>
          {unlocked.length === 0 ? (
            <p className="mt-1.5 text-xs leading-relaxed text-white/45">
              {t.play.meaning.renunganEmpty}
            </p>
          ) : (
            <ul className="renungan-scroll mt-1.5 max-h-36 space-y-2 overflow-y-auto pr-2">
              {NOTICE_KEYS.filter((k) => unlocked.includes(k)).map((k) => (
                <li key={k} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[#f2b23c]">
                    {t.play.meaning.notices[k].title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/70">
                    {t.play.meaning.notices[k].body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={resumeRef}
            onClick={onResume}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#f2b23c] px-4 py-3 text-sm font-black text-[#101418] shadow-lg transition hover:bg-[#e0a22c] focus-visible:outline-2 focus-visible:outline-white"
          >
            <Play size={15} fill="currentColor" />
            {t.play.resume}
          </button>

          {confirmClear ? (
            <div className="rounded-xl border border-[#a12f22]/50 bg-[#a12f22]/10 p-2">
              <p className="px-1 pb-2 text-center text-xs font-bold text-white">
                {t.play.clearConfirm.replace('{count}', String(count))}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClear}
                  className="flex-1 rounded-lg bg-[#f7f9fa] px-3 py-2 text-xs font-black text-[#a12f22] shadow transition hover:bg-white focus-visible:outline-2 focus-visible:outline-white"
                >
                  {t.play.clearYes}
                </button>
                <button
                  onClick={onCancelClear}
                  className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
                >
                  {t.play.clearCancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onAskClear}
              disabled={count === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#a12f22]/40 bg-[#f7f9fa] px-4 py-3 text-sm font-black text-[#a12f22] shadow-lg transition hover:bg-[#a12f22] hover:text-white focus-visible:outline-2 focus-visible:outline-[#f2b23c] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
            >
              <Trash2 size={15} />
              {t.play.clear}
            </button>
          )}

          <button
            onClick={onExit}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/70"
          >
            <LogOut size={15} />
            {t.play.exit}
          </button>
        </div>

        <p className="mt-4 text-center text-[0.65rem] font-semibold text-white/40">
          {t.play.escHint}
        </p>
      </div>
    </div>
  )
}

function TouchControls() {
  const { t } = useI18n()
  return (
    <>
      <LookPad />
      <Joystick />
      <div data-actions className="pointer-events-auto absolute bottom-24 right-4 flex flex-col items-end gap-2">
        <ActionButton label={t.play.jump} onPress={() => (input.jumpQueued = true)} />
        <ActionButton
          label={t.play.breakBlock}
          onPress={() => {
            input.breakQueued = true
          }}
        />
        <ActionButton
          label={t.play.placeBlock}
          onPress={() => {
            input.placeQueued = true
          }}
        />
        <ActionButton
          label={t.play.runLabel}
          onPress={() => (input.run = !input.run)}
        />
      </div>
    </>
  )
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className="min-w-16 rounded-full border border-white/30 bg-[#101418]/80 px-4 py-2.5 text-xs font-bold text-white backdrop-blur active:bg-[#408fb4]"
    >
      {label}
    </button>
  )
}

function Joystick() {
  const [thumb, setThumb] = useState({ x: 0, y: 0 })
  const state = useRef<{ id: number; ox: number; oy: number } | null>(null)

  return (
    <div
      data-joystick
      className="pointer-events-auto absolute bottom-6 left-5 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-white/25 bg-[#101418]/50 backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = e.currentTarget.getBoundingClientRect()
        state.current = {
          id: e.pointerId,
          ox: rect.left + rect.width / 2,
          oy: rect.top + rect.height / 2,
        }
        setThumb({ x: 0, y: 0 })
      }}
      onPointerMove={(e) => {
        const s = state.current
        if (!s || s.id !== e.pointerId) return
        const max = 46
        const dx = Math.max(-max, Math.min(max, e.clientX - s.ox))
        const dy = Math.max(-max, Math.min(max, e.clientY - s.oy))
        setThumb({ x: dx, y: dy })
        input.strafe = dx / max
        input.forward = -dy / max
      }}
      onPointerUp={() => {
        state.current = null
        setThumb({ x: 0, y: 0 })
        input.strafe = 0
        input.forward = 0
      }}
      onPointerCancel={() => {
        state.current = null
        setThumb({ x: 0, y: 0 })
        input.strafe = 0
        input.forward = 0
      }}
    >
      <div
        className="h-14 w-14 rounded-full border border-white/40 bg-white/25"
        style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
      />
    </div>
  )
}

function LookPad() {
  const state = useRef<{
    id: number
    x: number
    y: number
    sx: number
    sy: number
    moved: boolean
  } | null>(null)

  return (
    <div
      data-lookpad
      className="pointer-events-auto absolute inset-y-0 right-0 -z-10 w-1/2 touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        state.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          sx: e.clientX,
          sy: e.clientY,
          moved: false,
        }
      }}
      onPointerMove={(e) => {
        const s = state.current
        if (!s || s.id !== e.pointerId) return
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        s.x = e.clientX
        s.y = e.clientY
        if (!s.moved) {
          // a tap aims; only a real drag turns the camera
          if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < 6) return
          s.moved = true
          if (input.pointAim) {
            input.pointAim = null
            input.aimX = 0
            input.aimY = 0
            emitAim()
          }
        }
        input.lookX += dx
        input.lookY += dy
      }}
      onPointerUp={(e) => {
        const s = state.current
        state.current = null
        if (s && s.id === e.pointerId && !s.moved) setTapAim(e.clientX, e.clientY)
      }}
      onPointerCancel={() => {
        state.current = null
      }}
    />
  )
}
