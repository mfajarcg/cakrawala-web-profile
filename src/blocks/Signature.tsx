import { CheckCircle2 } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function Signature() {
  const { t } = useI18n()
  const s = t.signature
  return (
    <Panel id="signature">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{s.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{s.lead}</p>

      <div className="mt-5 rounded-xl bg-[#101418] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f2b23c]">{s.project}</p>
        <p className="text-sm text-white/60">{s.period}</p>
        <p className="mt-3 text-sm leading-relaxed text-white/90">{s.body}</p>
      </div>

      <ul className="mt-5 space-y-3">
        {s.highlights.map((h) => (
          <li key={h} className="flex gap-2.5 text-sm leading-relaxed text-[#101418]/80">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[#5aa66f]" size={17} aria-hidden="true" />
            {h}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
