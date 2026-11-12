import { Building2, Landmark, MapPin } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function Market() {
  const { t } = useI18n()
  const m = t.market
  return (
    <Panel id="market">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{m.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{m.lead}</p>

      <div className="mt-6 space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
            <MapPin size={14} aria-hidden="true" />
            {m.regionsTitle}
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {m.regions.map((r) => (
              <span
                key={r}
                className="rounded-full bg-[#408fb4]/10 px-3 py-1 text-xs font-semibold text-[#2e6f8e]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
            <Landmark size={14} aria-hidden="true" />
            {m.institutionsTitle}
          </h3>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {m.institutions.map((i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-[#101418]/80">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f2b23c]" aria-hidden="true" />
                {i}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
            <Building2 size={14} aria-hidden="true" />
            {m.bankingTitle}
          </h3>
          <p className="mt-2 text-sm text-[#101418]/70">{m.banking}</p>
        </div>
      </div>
    </Panel>
  )
}
