import { Languages, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { jumpTo } from '../journey/jump'
import { useI18n } from '../lib/i18n'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-white.svg`

export function Nav() {
  const { t, toggle } = useI18n()
  const [open, setOpen] = useState(false)

  const jump = (id: string) => {
    setOpen(false)
    jumpTo(id)
  }

  return (
    <header className="fixed inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-[min(96vw,120rem)] items-center justify-between gap-4 rounded-b-2xl bg-[#101418]/90 px-4 py-2.5 backdrop-blur sm:px-6">
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault()
            jump('hero')
          }}
          className="flex items-center gap-3"
          aria-label="Cakrawala"
        >
          <img src={LOGO} alt="Cakrawala" className="h-9 w-9 rounded-sm bg-white object-contain p-0.5" />
          <span className="leading-tight text-white">
            <span className="block text-sm font-bold tracking-wide">CAKRAWALA</span>
            <span className="block text-[0.6rem] opacity-70">by PT Cartenz Technology Indonesia</span>
          </span>
        </a>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main">
          {t.nav.links.map((l) => (
            <button
              key={l.id}
              onClick={() => jump(l.id)}
              className="text-sm text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            aria-label={t.nav.language}
          >
            <Languages size={14} />
            {t.nav.language}
          </button>
          <button
            className="rounded-full border border-white/25 p-1.5 text-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={t.nav.menu}
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="mx-auto flex w-[min(96vw,120rem)] flex-col gap-1 rounded-b-2xl bg-[#101418]/95 p-4 backdrop-blur lg:hidden"
          aria-label="Mobile"
        >
          {t.nav.links.map((l) => (
            <button
              key={l.id}
              onClick={() => jump(l.id)}
              className="rounded-lg px-3 py-2.5 text-left text-white/90 transition hover:bg-white/10"
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}
