export type StationId =
  | 'hero'
  | 'story'
  | 'services'
  | 'credibility'
  | 'numbers'
  | 'signature'
  | 'market'
  | 'about'
  | 'play'
  | 'contact'
  | 'footer'

export interface Station {
  id: StationId
  index: number
  /** position along the isometric path (world units) */
  x: number
  z: number
  /** which side of the path the DOM panel sits on */
  side: 'left' | 'right'
}

const GAP = 26

export const STATIONS: Station[] = [
  { id: 'hero', index: 1, x: 0, z: 0, side: 'left' },
  { id: 'story', index: 2, x: GAP, z: -6, side: 'right' },
  { id: 'services', index: 3, x: GAP * 2, z: 6, side: 'left' },
  { id: 'credibility', index: 4, x: GAP * 3, z: -6, side: 'right' },
  { id: 'numbers', index: 5, x: GAP * 4, z: 6, side: 'left' },
  { id: 'signature', index: 6, x: GAP * 5, z: -6, side: 'right' },
  { id: 'market', index: 7, x: GAP * 6, z: 6, side: 'left' },
  { id: 'about', index: 8, x: GAP * 7, z: -6, side: 'right' },
  { id: 'play', index: 9, x: GAP * 8, z: 6, side: 'left' },
  { id: 'contact', index: 10, x: GAP * 9, z: -6, side: 'right' },
  { id: 'footer', index: 11, x: GAP * 10, z: 0, side: 'left' },
]

export const STATION_COUNT = STATIONS.length
