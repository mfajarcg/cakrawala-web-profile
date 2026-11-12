import { BlockStack } from '../play/BlockStack'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

export function PlayMoment() {
  const { t } = useI18n()
  return (
    <Panel id="play">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.play.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.play.lead}</p>
      <div className="mt-5">
        <BlockStack />
      </div>
    </Panel>
  )
}
