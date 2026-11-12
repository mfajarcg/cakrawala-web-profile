import { ArrowUp } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-black.svg`

export function Footer() {
  const { t } = useI18n()
  const f = t.footer
  return (
    <Panel id="footer" center>
      <div className="flex flex-col items-center text-center">
        <img src={LOGO} alt="Cakrawala logo" className="h-16 w-16" />
        <p className="mt-3 text-sm font-bold">{f.copyright}</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-[#101418]/55">{f.trademark}</p>

        <div className="mt-6 w-full rounded-xl bg-[#101418] p-5 text-left">
          <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#f2b23c]">
            {f.tributeTitle}
          </h2>
          <ul className="mt-3 space-y-1.5">
            {f.tribute.map((item) => (
              <li key={item} className="text-xs leading-relaxed text-white/75">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-6 flex items-center gap-2 rounded-full border-2 border-[#101418]/15 px-5 py-2.5 text-sm font-bold transition hover:border-[#408fb4] hover:text-[#2e6f8e] focus-visible:outline-2 focus-visible:outline-[#101418]"
        >
          <ArrowUp size={16} />
          {f.backToTop}
        </button>
      </div>
    </Panel>
  )
}
