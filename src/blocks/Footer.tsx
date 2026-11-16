import { ArrowUp } from 'lucide-react'
import { jumpTo } from '../journey/jump'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

const LOGO = `${import.meta.env.BASE_URL}logo/cakrawala-black.svg`

interface TributeItem {
  text: string
  href?: string
  mono?: boolean
}

export function Footer() {
  const { t } = useI18n()
  const f = t.footer
  return (
    <Panel id="footer" center wide>
      <div className="flex flex-col items-center text-center">
        <div className="rounded-2xl border border-[#101418]/10 bg-white p-2.5 shadow-[0_0.5rem_1.5rem_rgba(16,20,24,0.08)]">
          <img src={LOGO} alt="Cakrawala logo" className="h-16 w-16" />
        </div>
        <p className="mt-3 text-sm font-bold">{f.copyright}</p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-[#101418]/55">{f.trademark}</p>

        <div className="mt-6 w-full rounded-xl bg-[#101418] p-5 text-left sm:p-7">
          <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-[#f2b23c]">
            {f.tributeTitle}
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {f.tributeGroups.map((group, gi) => (
              <section key={group.title} className={gi === f.tributeGroups.length - 1 ? 'md:col-span-2' : ''}>
                <h3 className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-[#f2b23c]/90">
                  {group.title}
                </h3>
                <ul
                  className={`mt-2 gap-1.5 ${
                    gi === f.tributeGroups.length - 1 ? 'grid sm:grid-cols-2 sm:gap-x-6' : 'space-y-1.5'
                  }`}
                >
                  {group.items.map((raw) => {
                    const item = raw as TributeItem
                    return (
                      <li
                        key={item.text}
                        className={
                          item.mono
                            ? 'font-mono text-[0.66rem] leading-relaxed text-[#9fd0e8]'
                            : 'text-xs leading-relaxed text-white/75'
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
