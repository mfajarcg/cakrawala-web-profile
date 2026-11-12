import Matter from 'matter-js'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'

const BLOCK_COLORS: Record<string, string> = {
  server: '#408fb4',
  cloud: '#5aa66f',
  doc: '#f2b23c',
  laptop: '#2e6f8e',
  gear: '#8a6b4a',
  coffee: '#c96f4a',
}

const W = 560
const H = 320
const GROUND_Y = H - 36
const BEST_KEY = 'cakrawala-stack-best'

interface StackState {
  height: number
  best: number
}

export function BlockStack() {
  const { t } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const bodiesRef = useRef<Matter.Body[]>([])
  const labelsRef = useRef(new Map<number, string>())
  const dragKind = useRef<string | null>(null)
  const [score, setScore] = useState<StackState>({ height: 0, best: 0 })

  useEffect(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.1 } })
    engineRef.current = engine
    const world = engine.world

    Matter.Composite.add(world, [
      Matter.Bodies.rectangle(W / 2, GROUND_Y + 30, W * 2, 60, {
        isStatic: true,
        label: 'ground',
      }),
      Matter.Bodies.rectangle(-20, H / 2, 40, H * 2, { isStatic: true, label: 'wall' }),
      Matter.Bodies.rectangle(W + 20, H / 2, 40, H * 2, { isStatic: true, label: 'wall' }),
    ])

    let best = 0
    try {
      best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0
    } catch {
      // ignore
    }
    setScore((s) => ({ ...s, best }))

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const scale = canvas.width / W

    const drawBody = (b: Matter.Body) => {
      const label = labelsRef.current.get(b.id)
      const color = BLOCK_COLORS[label ?? ''] ?? '#408fb4'
      const vertices = b.vertices
      const topLift = 10

      // top face (iso-ish parallelogram)
      ctx.fillStyle = shade(color, 24)
      ctx.beginPath()
      ctx.moveTo(vertices[0].x, vertices[0].y - topLift)
      for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y - topLift)
      ctx.closePath()
      ctx.fill()

      // front face
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '600 11px system-ui'
      ctx.textAlign = 'center'
      const cx = (vertices[0].x + vertices[2].x) / 2
      const cy = (vertices[0].y + vertices[2].y) / 2
      const name = tRef.current.play.blocks.find((x) => x.kind === label)?.label ?? ''
      if (name) ctx.fillText(name, cx, cy + 4, 90)
    }

    const tRef = { current: t }
    tRef.current = t

    let raf = 0
    const loop = () => {
      Matter.Engine.update(engine, 1000 / 60)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // ground slab
      ctx.fillStyle = '#e7d9b8'
      ctx.fillRect(0, GROUND_Y, W, 26)
      ctx.fillStyle = '#d8c69e'
      ctx.fillRect(0, GROUND_Y + 26, W, 10)

      for (const b of bodiesRef.current) drawBody(b)

      // stack height
      let minTop = GROUND_Y
      for (const b of bodiesRef.current) {
        for (const v of b.vertices) minTop = Math.min(minTop, v.y)
      }
      const height = Math.max(0, Math.round((GROUND_Y - minTop) / 10))
      setScore((s) => {
        const bestNow = Math.max(s.best, height)
        if (bestNow !== s.best) {
          try {
            localStorage.setItem(BEST_KEY, String(bestNow))
          } catch {
            // ignore
          }
        }
        return { height, best: bestNow }
      })

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      Matter.Engine.clear(engine)
      Matter.Composite.clear(world, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spawn = (kind: string, x: number) => {
    const world = engineRef.current?.world
    if (!world) return
    const size = 44 + Math.random() * 14
    const body = Matter.Bodies.rectangle(
      Math.min(W - 30, Math.max(30, x)),
      10,
      size,
      size * 0.7,
      { restitution: 0.05, friction: 0.6, frictionStatic: 0.9 },
    )
    labelsRef.current.set(body.id, kind)
    bodiesRef.current.push(body)
    Matter.Composite.add(world, body)
  }

  const reset = () => {
    const world = engineRef.current?.world
    if (!world) return
    for (const b of bodiesRef.current) {
      labelsRef.current.delete(b.id)
      Matter.Composite.remove(world, b)
    }
    bodiesRef.current = []
  }

  const canvasPoint = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return ((clientX - rect.left) / rect.width) * W
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-black text-[#408fb4]">
          {score.height}
          <span className="ml-1 text-xs font-semibold text-[#101418]/60">{t.play.score}</span>
        </p>
        <p className="text-xs font-semibold text-[#101418]/50">
          {t.play.best}: {score.best}
        </p>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="mt-2 w-full touch-none rounded-xl border border-black/10 bg-gradient-to-b from-[#eef4f7] to-[#e2ecf1]"
        aria-label={t.play.title}
        onPointerUp={(e) => {
          if (dragKind.current) {
            spawn(dragKind.current, canvasPoint(e.clientX))
            dragKind.current = null
          }
        }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {t.play.blocks.map((b) => (
          <button
            key={b.kind}
            onPointerDown={() => (dragKind.current = b.kind)}
            onClick={() => spawn(b.kind, W / 2 + (Math.random() * 160 - 80))}
            className="cursor-grab rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition active:cursor-grabbing"
            style={{ backgroundColor: BLOCK_COLORS[b.kind] }}
          >
            {b.label}
          </button>
        ))}
        <button
          onClick={reset}
          className="rounded-lg border-2 border-[#101418]/15 px-3 py-2 text-xs font-bold transition hover:border-[#408fb4]"
        >
          {t.play.reset}
        </button>
      </div>
      <p className="mt-2 text-xs text-[#101418]/50">{t.play.hint}</p>
    </div>
  )
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, (n >> 16) + amount)
  const g = Math.min(255, ((n >> 8) & 0xff) + amount)
  const b = Math.min(255, (n & 0xff) + amount)
  return `rgb(${r},${g},${b})`
}
