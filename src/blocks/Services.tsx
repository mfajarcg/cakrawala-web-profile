import {
  AppWindow,
  Compass,
  Database,
  Network,
  ShieldCheck,
  Wrench,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Panel } from './Panel'

const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  network: Network,
  'shield-check': ShieldCheck,
  'app-window': AppWindow,
  database: Database,
  workflow: Workflow,
  wrench: Wrench,
}

export function Services() {
  const { t } = useI18n()
  return (
    <Panel id="services">
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">{t.services.title}</h2>
      <p className="mt-1.5 text-xs text-[#101418]/70 sm:text-sm">{t.services.lead}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 @[40rem]:grid-cols-3 @[40rem]:gap-3">
        {t.services.items.map((s) => {
          const Icon = ICONS[s.icon] ?? Compass
          return (
            <li
              key={s.title}
              className="rounded-xl border border-black/5 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md @[40rem]:p-4"
            >
              <Icon className="text-[#408fb4]" size={20} aria-hidden="true" />
              <h3 className="mt-1 text-[0.7rem] font-bold leading-tight @[40rem]:text-xs">{s.title}</h3>
              <p className="mt-0.5 text-[0.65rem] leading-snug text-[#101418]/70 @[40rem]:text-[0.7rem] @[40rem]:leading-relaxed">{s.text}</p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
