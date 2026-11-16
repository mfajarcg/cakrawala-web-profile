import type { ReactNode } from 'react'
import { STATIONS, type StationId } from '../journey/stations'

/**
 * One journey etape in the left substance column. On desktop the column owns
 * 46% of the screen and the 3D world the rest; on mobile the card is full
 * width and the world floats in a draggable PiP window.
 */
export function Panel({ id, children }: { id: StationId; children: ReactNode }) {
  const station = STATIONS.find((s) => s.id === id)!

  return (
    <section
      id={id}
      data-station={station.index}
      className="journey-col flex min-h-[110vh] w-full items-center justify-center px-[4vw] md:justify-start md:px-[3vw]"
    >
      <div className="@container relative w-full rounded-2xl border border-black/5 bg-white/95 p-6 shadow-[0_1.5rem_4rem_rgba(16,20,24,0.12)] backdrop-blur-sm sm:p-10">
        <span className="absolute -top-3 left-6 rounded-full bg-[#408fb4] px-3 py-1 text-xs font-bold tracking-widest text-white">
          {String(station.index).padStart(2, '0')} / 11
        </span>
        {children}
      </div>
    </section>
  )
}