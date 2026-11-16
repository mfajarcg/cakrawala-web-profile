import { Play } from 'lucide-react'
import { BLOCK_COLORS, BLOCK_KINDS, useGame } from '../game/store'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function PlayMoment() {
  const { t } = useI18n()
  const enter = useGame((s) => s.enter)
  const saved = useGame((s) => s.blocks.length)

  return (
    <Panel id="play">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.play.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.play.lead}</p>

      <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#101418] to-[#22303a] p-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f2b23c]">
          {t.play.gameTitle}
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/75">
          {t.play.ctaNote}
        </p>
        <button
          onClick={enter}
          className="mt-5 flex items-center gap-2 rounded-full bg-[#f2b23c] px-6 py-3 text-sm font-black text-[#101418] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#e0a22c] focus-visible:outline-2 focus-visible:outline-white"
        >
          <Play size={16} fill="currentColor" />
          {t.play.cta}
        </button>

        <div className="mt-5 flex flex-wrap gap-2">
          {BLOCK_KINDS.map((kind) => {
            const label = t.play.blocks.find((b) => b.kind === kind)?.label ?? kind
            return (
              <span
                key={kind}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.65rem] font-bold text-white/80"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: BLOCK_COLORS[kind] }}
                />
                {label}
              </span>
            )
          })}
        </div>

        {saved > 0 && (
          <p className="mt-4 text-[0.7rem] font-semibold text-white/45">
            {t.play.saved}: {saved}
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-[#101418]/50">{t.play.hint}</p>
    </Panel>
  )
}
