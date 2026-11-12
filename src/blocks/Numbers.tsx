import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

function Counter({
  value,
  suffix,
  decimals = 0,
}: {
  value: number
  suffix: string
  decimals?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const duration = 1400
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setDisplay((value * eased).toFixed(decimals))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, decimals])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

export function Numbers() {
  const { t } = useI18n()
  return (
    <Panel id="numbers">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.numbers.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.numbers.lead}</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {t.numbers.items.map((n) => (
          <div
            key={n.label}
            className="rounded-xl border border-black/5 bg-white p-4 text-center shadow-sm"
          >
            <dt className="order-2 mt-1 block text-[0.7rem] leading-snug text-[#101418]/60">
              {n.label}
            </dt>
            <dd className="order-1 text-3xl font-black text-[#408fb4] sm:text-4xl">
              <Counter value={n.value} suffix={n.suffix} decimals={'decimals' in n ? n.decimals : 0} />
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
