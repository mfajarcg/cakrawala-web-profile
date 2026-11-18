import { BadgeCheck } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function Credibility() {
  const { t } = useI18n()
  return (
    <Panel id="credibility">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.credibility.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.credibility.lead}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {t.credibility.certs.map((c) => (
          <span
            key={c}
            className="flex items-center gap-1.5 rounded-full bg-[#408fb4]/10 px-4 py-2 text-sm font-bold text-[#2e6f8e]"
          >
            <BadgeCheck size={16} aria-hidden="true" />
            {c}
          </span>
        ))}
      </div>

      <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
        {t.credibility.stackTitle}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {t.credibility.stack.map((tech) => (
          <span
            key={tech}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#101418]/80"
          >
            {tech}
          </span>
        ))}
      </div>

      <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
        {t.credibility.methodsTitle}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {t.credibility.methods.map((method) => (
          <span
            key={method}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium text-[#101418]/80"
          >
            {method}
          </span>
        ))}
      </div>

      <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#101418]/50">
        {t.credibility.partnersTitle}
      </h3>
      <p className="mt-2 text-xs italic text-[#101418]/50">{t.credibility.partnersNote}</p>
      <PartnerStrip />
    </Panel>
  )
}

/**
 * Text-strip of ministry / institution partners extracted from the
 * official Cartenz deck (slide 2). Logo versions land in a later pass.
 */
function PartnerStrip() {
  const { lang } = useI18n()
  const partners =
    lang === 'id'
      ? [
          'Kementerian Keuangan',
          'Kementerian Investasi/BKPM',
          'Bappenas',
          'SKK Migas',
          'Bareskrim Polri',
          'PERURI',
          'Universitas Indonesia',
          'OSS RBA',
          'SmartGov',
          'CitiGov',
        ]
      : [
          'Ministry of Finance',
          'Ministry of Investment/BKPM',
          'Bappenas',
          'SKK Migas',
          'Bareskrim Polri',
          'PERURI',
          'Universitas Indonesia',
          'OSS RBA',
          'SmartGov',
          'CitiGov',
        ]
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {partners.map((p) => (
        <span
          key={p}
          className="rounded-lg bg-[#101418]/5 px-3 py-1.5 text-xs font-semibold text-[#101418]/70"
        >
          {p}
        </span>
      ))}
    </div>
  )
}
