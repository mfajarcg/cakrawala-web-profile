import { ArrowLeft, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { scrollBridge } from '../journey/scroll'
import { useJourney } from '../journey/store'
import { useI18n } from '../lib/i18n'
import { useTribute } from '../lib/tribute'

interface TributeItem {
  text: string
  href?: string
  mono?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

export function TributeOverlay() {
  const open = useTribute((s) => s.open)
  const { t } = useI18n()
  const f = t.footer
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const groupRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!open) return
    useTribute.setState({ returnTo: useJourney.getState().activeStation })
    scrollBridge.lock(true)
    setActive(0)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    // focus the pane, not the close button: Space/arrows must scroll credits
    scrollRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useTribute.getState().setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      scrollBridge.lock(false)
      scrollBridge.toStation(useTribute.getState().returnTo)
      document
        .querySelector<HTMLButtonElement>('[data-tribute-open]')
        ?.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  const close = () => useTribute.getState().setOpen(false)
  const headerH = () => headerRef.current?.offsetHeight ?? 0

  const jumpToGroup = (i: number) => {
    const el = scrollRef.current
    const group = groupRefs.current[i]
    if (!el || !group) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top =
      group.getBoundingClientRect().top -
      el.getBoundingClientRect().top +
      el.scrollTop -
      headerH() -
      16
    el.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
  }

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const line = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + 32
    let idx = 0
    groupRefs.current.forEach((g, i) => {
      if (g && g.getBoundingClientRect().top <= line) idx = i
    })
    // the last group can never reach the header line at full scroll clamp
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) idx = groups.length - 1
    setActive(idx)
  }

  const groups = f.tributeGroups

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={f.tributeTitle}
      className="tribute-root fixed inset-0 z-50 bg-[#0b0e12] text-white"
    >
      <div aria-hidden className="tribute-bg pointer-events-none fixed inset-0" />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex={-1}
        data-lenis-prevent
        className="tribute-scroll relative h-full overflow-y-auto overscroll-contain outline-none"
      >
        <header
          ref={headerRef}
          className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0e12]/85 backdrop-blur-md"
        >
          <div className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
            <div className="min-w-0 pr-16 md:pr-44">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-[#f2b23c]">
                PT Cartenz Technology Indonesia
              </p>
              <h2 className="mt-0.5 truncate text-xl font-black tracking-tight sm:text-2xl">
                {f.tributeTitle}
              </h2>
            </div>
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6">
            <span className="hidden items-center gap-2 text-[0.65rem] font-bold text-white/50 md:flex">
              <span className="keycap">Esc</span>
              {f.tributeEsc}
            </span>
            <button
              onClick={close}
              aria-label={f.tributeClose}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition duration-300 hover:rotate-90 hover:border-[#f2b23c] hover:bg-[#f2b23c] hover:text-[#101418] focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative lg:hidden">
            <nav
              aria-label={f.tributeIndex}
              className="tribute-chips mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 pb-3"
            >
              {groups.map((g, i) => (
                <button
                  key={g.title}
                  onClick={() => jumpToGroup(i)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[0.65rem] font-bold transition ${
                    active === i
                      ? 'border-[#f2b23c] bg-[#f2b23c] text-[#101418]'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {pad(i + 1)} · {g.title}
                </button>
              ))}
            </nav>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0b0e12] to-transparent"
            />
          </div>
        </header>

        <div className="relative mx-auto max-w-6xl px-5 pb-10 sm:px-8">
          <p
            className="tribute-stagger mt-6 max-w-3xl text-sm leading-relaxed text-white/70"
            style={{ animationDelay: '60ms' }}
          >
            {f.tributeLead}
          </p>

          <div className="mt-8 flex gap-10">
            <nav
              aria-label={f.tributeIndex}
              className="sticky top-24 hidden h-fit w-52 shrink-0 space-y-1 lg:block"
            >
              {groups.map((g, i) => (
                <button
                  key={g.title}
                  onClick={() => jumpToGroup(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                    active === i
                      ? 'bg-white/10 text-[#f2b23c]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className={`font-mono text-[0.6rem] ${
                      active === i ? 'text-[#f2b23c]' : 'text-white/40'
                    }`}
                  >
                    {pad(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1">{g.title}</span>
                  <span
                    className={`h-4 w-0.5 shrink-0 rounded-full ${
                      active === i ? 'bg-[#f2b23c]' : 'bg-transparent'
                    }`}
                  />
                </button>
              ))}
            </nav>

            <div className="min-w-0 flex-1 space-y-10">
              {groups.map((group, gi) => (
                <section
                  key={group.title}
                  ref={(el) => {
                    groupRefs.current[gi] = el
                  }}
                  className="tribute-stagger"
                  style={{ animationDelay: `${120 + gi * 70}ms` }}
                >
                  <h3 className="flex items-baseline gap-3 text-[0.7rem] font-black uppercase tracking-[0.22em] text-[#f2b23c]">
                    <span className="font-mono text-[0.65rem] text-[#9fd0e8]">{pad(gi + 1)}</span>
                    {group.title}
                  </h3>
                  <ul
                    className={`mt-3 ${
                      gi >= groups.length - 2
                        ? 'grid gap-2 md:grid-cols-2 md:gap-x-6'
                        : 'space-y-2'
                    }`}
                  >
                    {group.items.map((raw) => {
                      const item = raw as TributeItem
                      return (
                        <li
                          key={item.text}
                          className={
                            item.mono
                              ? 'rounded-md border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[0.7rem] leading-relaxed text-[#9fd0e8]'
                              : 'text-sm leading-relaxed text-white/80'
                          }
                        >
                          {item.href ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline decoration-white/25 underline-offset-2 transition hover:text-white hover:decoration-[#f2b23c]"
                            >
                              {item.text}
                            </a>
                          ) : (
                            item.text
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <footer className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-white/50">{f.copyright}</p>
            <button
              onClick={close}
              className="inline-flex items-center gap-2 self-start rounded-full bg-[#f2b23c] px-5 py-2.5 text-sm font-bold text-[#101418] transition hover:bg-[#ffd075] focus-visible:outline-2 focus-visible:outline-white sm:self-auto"
            >
              <ArrowLeft size={16} />
              {f.tributeReturn}
            </button>
          </footer>
        </div>
      </div>
    </div>
  )
}