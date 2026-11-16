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
  breakQueued: false,
  placeQueued: false,
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
}
