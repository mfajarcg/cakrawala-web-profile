import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { input, resetInput } from './input'
import { BLOCK_COLORS, BLOCK_KINDS, useGame } from './store'

export function GameHud() {
  const { t } = useI18n()
  const selected = useGame((s) => s.selected)
  const select = useGame((s) => s.select)
  const exit = useGame((s) => s.exit)
  const clear = useGame((s) => s.clear)
  const count = useGame((s) => s.blocks.length)
  const [touch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
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
        case 'Escape':
          exit()
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
  }, [exit, select])

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none text-white">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="rounded-xl bg-[#101418]/80 px-4 py-2 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f2b23c]">
            {t.play.gameTitle}
          </p>
          <p className="mt-0.5 max-w-[52ch] text-[0.7rem] leading-snug text-white/75">
            {touch ? t.play.gameHintTouch : t.play.gameHint}
          </p>
          <p className="mt-1 text-[0.65rem] text-white/45">
            {t.play.saved}: {count}
          </p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={clear}
            className="rounded-full border border-white/25 px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-white/10"
          >
            {t.play.clear}
          </button>
          <button
            onClick={exit}
            className="rounded-full bg-[#f2b23c] px-4 py-2 text-xs font-black text-[#101418] transition hover:bg-[#e0a22c]"
          >
            {t.play.exit}
          </button>
        </div>
      </div>

      {/* crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-4 w-4 rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(16,20,24,0.35)]" />
      </div>

      {/* hotbar */}
      <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-1.5 px-4">
        <p className="rounded-full bg-[#101418]/70 px-3 py-1 text-[0.65rem] font-bold text-white/85 backdrop-blur">
          {t.play.blocks.find((b) => b.kind === selected)?.label ?? selected}
        </p>
        <div className="pointer-events-auto flex items-end gap-1.5 rounded-2xl bg-[#101418]/80 p-2 backdrop-blur">
          {BLOCK_KINDS.map((kind, i) => {
            const label = t.play.blocks.find((b) => b.kind === kind)?.label ?? kind
            const active = selected === kind
            return (
              <button
                key={kind}
                onClick={() => select(kind)}
                title={label}
                aria-pressed={active}
                className={`flex w-14 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition ${
                  active ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span
                  className="h-7 w-7 rounded-md border-2 border-white/30"
                  style={{ backgroundColor: BLOCK_COLORS[kind] }}
                />
                <span className="text-[0.55rem] font-bold leading-none text-white/70">
                  {i + 1}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {touch && <TouchControls />}
    </div>
  )
}

function TouchControls() {
  const { t } = useI18n()
  return (
    <>
      <LookPad />
      <Joystick />
      <div className="pointer-events-auto absolute bottom-24 right-4 flex flex-col items-end gap-2">
        <ActionButton label={t.play.jump} onPress={() => (input.jumpQueued = true)} />
        <ActionButton
          label={t.play.breakBlock}
          onPress={() => {
            input.freeAim = true
            input.breakQueued = true
          }}
        />
        <ActionButton
          label={t.play.placeBlock}
          onPress={() => {
            input.freeAim = true
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
  const state = useRef<{ id: number; x: number; y: number } | null>(null)

  return (
    <div
      className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        state.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      }}
      onPointerMove={(e) => {
        const s = state.current
        if (!s || s.id !== e.pointerId) return
        input.lookX += e.clientX - s.x
        input.lookY += e.clientY - s.y
        s.x = e.clientX
        s.y = e.clientY
      }}
      onPointerUp={() => {
        state.current = null
      }}
      onPointerCancel={() => {
        state.current = null
      }}
    />
  )
}
