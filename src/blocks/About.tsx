import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function About() {
  const { t } = useI18n()
  const a = t.about
  return (
    <Panel id="about">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{a.title}</h2>
      <p className="mt-4 text-sm leading-relaxed text-[#101418]/80 sm:text-base">{a.body}</p>
      <p className="mt-4 inline-block rounded-full bg-[#f2b23c]/20 px-4 py-1.5 text-sm font-bold text-[#8a6413]">
        “{a.vision}”
      </p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        {a.facts.map((f) => (
          <div key={f.label} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <dt className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#101418]/50">
              {f.label}
            </dt>
            <dd className="mt-1 text-sm font-bold text-[#101418]/90">{f.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
