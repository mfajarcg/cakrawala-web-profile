import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

const STAGE_COLORS = ['#408fb4', '#f2b23c', '#5aa66f', '#2e6f8e', '#22303a']

export function Story() {
  const { t } = useI18n()
  return (
    <Panel id="story">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.story.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.story.lead}</p>
      <ol className="mt-6 space-y-4">
        {t.story.stages.map((s, i) => (
          <li key={s.key} className="flex gap-4">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ backgroundColor: STAGE_COLORS[i] }}
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-bold">{s.title}</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[#101418]/75">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
