import { Eye, Video } from 'lucide-react'
import { useJourney } from '../journey/store'
import { useI18n } from '../lib/i18n'

export function PovButton() {
  const { t } = useI18n()
  const pov = useJourney((s) => s.pov)
  const togglePov = useJourney((s) => s.togglePov)
  const isFp = pov === 'fp'

  return (
    <button
      onClick={togglePov}
      aria-pressed={isFp}
      aria-label={`PoV: ${isFp ? t.nav.povFirst : t.nav.povFollow}`}
      className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full border border-white/25 bg-[#101418]/85 px-3 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-[#101418] focus-visible:outline-2 focus-visible:outline-[#f2b23c]"
    >
      {isFp ? <Eye size={14} /> : <Video size={14} />}
      <span className="hidden sm:inline">PoV:</span> {isFp ? t.nav.povFirst : t.nav.povFollow}
    </button>
  )
}
