/** shared control state: DOM handlers write, the game loop consumes */
export const input = {
  /** -1..1, camera-relative axes */
  forward: 0,
  strafe: 0,
  run: false,
  jumpQueued: false,
  /** accumulated look deltas (pixels) since the last frame */
  lookX: 0,
  lookY: 0,
  /** aim in NDC when the pointer is not locked */
  aimX: 0,
  aimY: 0,
  /** true when pointer lock is unavailable, so aim comes from the cursor */
  freeAim: false,
  /** screen-space aim set by a touch tap; null means the centre crosshair */
  pointAim: null as { x: number; y: number } | null,
  breakQueued: false,
  placeQueued: false,
}

const aimListeners = new Set<() => void>()

/** lets the HUD reticle follow tap-aim without polling the mutable input */
export function subscribeAim(fn: () => void) {
  aimListeners.add(fn)
  return () => {
    aimListeners.delete(fn)
  }
}

export function emitAim() {
  aimListeners.forEach((fn) => fn())
}

/** aim from a screen-space tap on the play canvas — touch never takes the lock */
export function setTapAim(clientX: number, clientY: number) {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  input.aimX = ((clientX - rect.left) / rect.width) * 2 - 1
  input.aimY = -((clientY - rect.top) / rect.height) * 2 + 1
  input.pointAim = { x: clientX, y: clientY }
  input.freeAim = true
  emitAim()
}

export function resetInput() {
  input.forward = 0
  input.strafe = 0
  input.run = false
  input.jumpQueued = false
  input.lookX = 0
  input.lookY = 0
  input.breakQueued = false
  input.placeQueued = false
  input.pointAim = null
  emitAim()
}

/**
 * Timestamp of the last pointer-lock release. The Escape handler uses it to
 * tell "Esc that closed the lock" apart from a second Esc that should exit.
 */
export const lockState = { lastLostAt: 0 }
