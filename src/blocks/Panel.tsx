import type { ReactNode } from 'react'
import { STATIONS, type StationId } from '../journey/stations'

/**
 * One journey etape: a tall scroll section with a floating content card.
 * The fixed 3D world stays behind; the card alternates left/right.
 */
export function Panel({
  id,
  center = false,
  wide = false,
  children,
}: {
  id: StationId
  center?: boolean
  wide?: boolean
  children: ReactNode
}) {
  const station = STATIONS.find((s) => s.id === id)!
  const sideClass = center
    ? 'justify-center'
    : station.side === 'left'
      ? 'justify-start'
      : 'justify-end'
  const widthClass = wide ? 'w-[min(94vw,58rem)]' : 'w-[min(92vw,36rem)]'

  return (
    <section
      id={id}
      data-station={station.index}
      className={`flex min-h-[110vh] w-full items-center px-[4vw] ${sideClass}`}
    >
      <div
        className={`relative ${widthClass} rounded-2xl border border-black/5 bg-white/90 p-6 shadow-[0_1.5rem_4rem_rgba(16,20,24,0.12)] backdrop-blur-sm sm:p-10`}
      >
        <span className="absolute -top-3 left-6 rounded-full bg-[#408fb4] px-3 py-1 text-xs font-bold tracking-widest text-white">
          {String(station.index).padStart(2, '0')} / 11
        </span>
        {children}
      </div>
    </section>
  )
}
