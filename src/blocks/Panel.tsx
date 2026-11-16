import type { ReactNode } from 'react'
import { STATIONS, type StationId } from '../journey/stations'

/**
 * One journey etape in the left substance column. Content sits directly in the
 * column — no floating card — so the substance owns the full width. On mobile
 * the column is full width and the world floats in a draggable PiP window.
 */
export function Panel({ id, children }: { id: StationId; children: ReactNode }) {
  const station = STATIONS.find((s) => s.id === id)!

  return (
    <section
      id={id}
      data-station={station.index}
      className="journey-col flex min-h-[110vh] w-full items-center justify-center px-[5vw] md:justify-start md:px-[3.5vw]"
    >
      <div className="@container w-full max-w-[56rem]">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-full bg-[#408fb4] px-3 py-1 text-[0.65rem] font-black tracking-widest text-white">
            {String(station.index).padStart(2, '0')} / 11
          </span>
          <span
            aria-hidden="true"
            className="h-px flex-1 bg-gradient-to-r from-[#408fb4]/45 to-transparent"
          />
        </div>
        {children}
      </div>
    </section>
  )
}