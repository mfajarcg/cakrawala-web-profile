import * as THREE from 'three'
import { STATIONS } from '../journey/stations'

const PLAY = STATIONS.find((s) => s.id === 'play')!

/** blocks are stored in cell space around this world point — the Play station */
export const ARENA_ORIGIN = { x: PLAY.x, z: PLAY.z - 4 }

/**
 * Handles the game loop needs from the block meshes that World always renders.
 * Filled by <Arena/> so site and game mode share one set of blocks.
 */
export const arenaRefs: {
  blocks: THREE.Group | null
  floor: THREE.Mesh | null
} = { blocks: null, floor: null }
