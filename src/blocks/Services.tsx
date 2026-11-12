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
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.services.title}</h2>
      <p className="mt-2 text-sm text-[#101418]/70">{t.services.lead}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {t.services.items.map((s) => {
          const Icon = ICONS[s.icon] ?? Compass
          return (
            <li
              key={s.title}
              className="rounded-xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Icon className="text-[#408fb4]" size={22} aria-hidden="true" />
              <h3 className="mt-2 text-sm font-bold leading-snug">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#101418]/70">{s.text}</p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
