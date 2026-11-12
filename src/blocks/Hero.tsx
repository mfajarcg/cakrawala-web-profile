import { ArrowRight } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-black.svg`

export function Hero() {
  const { t } = useI18n()
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <Panel id="hero" center>
      <div className="flex flex-col items-center text-center">
        <img src={LOGO} alt="Cakrawala logo" className="mb-5 h-20 w-20 sm:h-24 sm:w-24" />
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#408fb4]">
          {t.hero.eyebrow}
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-6xl">{t.hero.title}</h1>
        <p className="mt-2 text-base font-medium text-[#101418]/70">{t.hero.subtitle}</p>
        <p className="mt-2 inline-block rounded-full bg-[#f2b23c]/20 px-4 py-1 text-sm font-bold text-[#8a6413]">
          “{t.meta.tagline}”
        </p>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[#101418]/75 sm:text-base">
          {t.hero.lead}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => jump('services')}
            className="flex items-center gap-2 rounded-full bg-[#408fb4] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#2e6f8e] focus-visible:outline-2 focus-visible:outline-[#101418]"
          >
            {t.hero.ctaPrimary}
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => jump('contact')}
            className="rounded-full border-2 border-[#101418]/15 px-6 py-3 text-sm font-bold transition hover:border-[#408fb4] hover:text-[#2e6f8e] focus-visible:outline-2 focus-visible:outline-[#101418]"
          >
            {t.hero.ctaSecondary}
          </button>
        </div>
        <p className="mt-6 text-xs text-[#101418]/50">{t.hero.hint}</p>
      </div>
    </Panel>
  )
}
