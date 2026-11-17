import { ArrowUp, ScrollText } from 'lucide-react'
import { jumpTo } from '../journey/jump'
import { useI18n } from '../lib/i18n'
import { useTribute } from '../lib/tribute'
import { Panel } from './Panel'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-white.svg`

export function Footer() {
  const { t } = useI18n()
  const f = t.footer
  return (
    <Panel id="footer">
      <div className="flex flex-col items-center text-center">
        <div className="logo-plate rounded-2xl border border-[#101418]/10 bg-white p-2.5 shadow-[0_0.5rem_1.5rem_rgba(16,20,24,0.08)]">
          <img src={LOGO} alt="Cakrawala logo" className="h-16 w-16" />
        </div>
        <p className="mt-3 text-sm font-bold">{f.copyright}</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-[#101418]/55">{f.trademark}</p>

        <button
          data-tribute-open
          onClick={() => useTribute.getState().setOpen(true)}
          className="group mt-6 w-full rounded-xl bg-[#101418] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_1rem_2.5rem_rgba(16,20,24,0.35)] focus-visible:outline-2 focus-visible:outline-[#408fb4] sm:p-6"
        >
          <span className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-[0.25em] text-[#f2b23c]">
                {f.tributeTitle}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-white/70">
                {f.tributeCta}
              </span>
              <span className="mt-2 block text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#9fd0e8]/80">
                {f.tributeHint}
              </span>
            </span>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#f2b23c]/40 bg-[#f2b23c]/10 text-[#f2b23c] transition group-hover:bg-[#f2b23c] group-hover:text-[#101418]">
              <ScrollText size={20} />
            </span>
          </span>
        </button>

        <button
          onClick={() => jumpTo('hero')}
          className="mt-6 flex items-center gap-2 rounded-full border-2 border-[#101418]/15 px-5 py-2.5 text-sm font-bold transition hover:border-[#408fb4] hover:text-[#2e6f8e] focus-visible:outline-2 focus-visible:outline-[#101418]"
        >
          <ArrowUp size={16} />
          {f.backToTop}
        </button>
      </div>
    </Panel>
  )
}