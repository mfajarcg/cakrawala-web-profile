import { scrollBridge } from './scroll'
import { STATIONS } from './stations'

/**
 * Navigate to a station by section id. All in-page links go through the
 * journey controller so a running checkpoint hop is retargeted instead of
 * fighting the native smooth scroll.
 */
export function jumpTo(id: string) {
  const index = STATIONS.findIndex((s) => s.id === id)
  if (index >= 0) scrollBridge.toStation(index)
}
