import { Compass, Languages, Menu, Moon, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { useGame } from '../game/store'
import { jumpTo } from '../journey/jump'
import { STATIONS } from '../journey/stations'
import { useJourney } from '../journey/store'
import { useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-white.svg`

export function Nav() {
  const { t, toggle } = useI18n()
  const night = useTheme((s) => s.night)
  const toggleTheme = useTheme((s) => s.toggle)
  const [open, setOpen] = useState(false)
  const active = STATIONS[useJourney((s) => s.activeStation)]?.id

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
          className="flex shrink-0 items-center gap-3"
          aria-label="Cakrawala"
        >
          <img src={LOGO} alt="Cakrawala" className="logo-plate h-9 w-9 rounded-sm bg-white object-contain p-0.5" />
          <span className="leading-tight text-white">
            <span className="block text-sm font-bold tracking-wide">CAKRAWALA</span>
            <span className="block text-[0.6rem] opacity-70">by PT Cartenz Technology Indonesia</span>
          </span>
        </a>

        <nav className="hidden items-center gap-4 xl:flex" aria-label="Main">
          {t.nav.links.map((l) => (
            <button
              key={l.id}
              onClick={() => jump(l.id)}
              aria-current={active === l.id ? 'page' : undefined}
              className={`relative whitespace-nowrap text-sm transition focus-visible:outline-2 focus-visible:outline-[#f2b23c] ${
                active === l.id ? 'font-semibold text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {l.label}
              <span
                aria-hidden
                className={`absolute -bottom-1.5 left-0 h-0.5 w-full origin-left rounded-full bg-[#f2b23c] transition-transform duration-300 ${
                  active === l.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => {
              setOpen(false)
              useGame.getState().enterAdventure()
            }}
            className="flex items-center gap-1.5 rounded-full border border-[#f2b23c]/60 px-3 py-1.5 text-xs font-bold text-[#f2b23c] transition hover:bg-[#f2b23c]/15 focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            aria-label={t.nav.roam}
            title={t.nav.roam}
          >
            <Compass size={14} />
            <span className="hidden sm:inline">{t.nav.roam}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            aria-label={night ? t.nav.themeToDay : t.nav.themeToNight}
            title={night ? t.nav.themeToDay : t.nav.themeToNight}
          >
            {night ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden sm:inline">{night ? t.nav.day : t.nav.night}</span>
          </button>
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
            aria-label={t.nav.language}
          >
            <Languages size={14} />
            {t.nav.language}
          </button>
          <button
            className="rounded-full border border-white/25 p-1.5 text-white xl:hidden"
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
          className="mx-auto flex max-h-[70vh] w-[min(96vw,120rem)] flex-col gap-1 overflow-y-auto rounded-b-2xl bg-[#101418]/95 p-4 backdrop-blur xl:hidden"
          aria-label="Mobile"
        >
          <button
            onClick={() => {
              setOpen(false)
              useGame.getState().enterAdventure()
            }}
            className="mb-1 flex items-center gap-2 rounded-lg border border-[#f2b23c]/50 bg-[#f2b23c]/10 px-3 py-2.5 text-left font-bold text-[#f2b23c] transition hover:bg-[#f2b23c]/20"
          >
            <Compass size={15} />
            {t.nav.roam}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              toggleTheme()
            }}
            className="mb-1 flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-left font-bold text-white transition hover:bg-white/10"
          >
            {night ? <Sun size={15} /> : <Moon size={15} />}
            {night ? t.nav.themeToDay : t.nav.themeToNight}
          </button>
          {t.nav.links.map((l) => (
            <button
              key={l.id}
              onClick={() => jump(l.id)}
              aria-current={active === l.id ? 'page' : undefined}
              className={`rounded-lg px-3 py-2.5 text-left transition ${
                active === l.id
                  ? 'bg-white/10 font-semibold text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}