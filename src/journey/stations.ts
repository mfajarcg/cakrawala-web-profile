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

// walkable, not a flight path: keep stations close enough that crossing to the
// next one takes about one human stride burst instead of half the diorama
const GAP = 13
const ZIG = 3.5

export const STATIONS: Station[] = [
  { id: 'hero', index: 1, x: 0, z: 0, side: 'left' },
  { id: 'story', index: 2, x: GAP, z: -ZIG, side: 'right' },
  { id: 'services', index: 3, x: GAP * 2, z: ZIG, side: 'left' },
  { id: 'credibility', index: 4, x: GAP * 3, z: -ZIG, side: 'right' },
  { id: 'numbers', index: 5, x: GAP * 4, z: ZIG, side: 'left' },
  { id: 'signature', index: 6, x: GAP * 5, z: -ZIG, side: 'right' },
  { id: 'market', index: 7, x: GAP * 6, z: ZIG, side: 'left' },
  { id: 'about', index: 8, x: GAP * 7, z: -ZIG, side: 'right' },
  { id: 'play', index: 9, x: GAP * 8, z: ZIG, side: 'left' },
  { id: 'contact', index: 10, x: GAP * 9, z: -ZIG, side: 'right' },
  { id: 'footer', index: 11, x: GAP * 10, z: 0, side: 'left' },
]

export const STATION_COUNT = STATIONS.length
