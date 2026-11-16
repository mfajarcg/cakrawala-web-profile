/**
 * Imperative bridge to the smooth-scroll controller. The journey controller
 * registers the real implementations on mount; the play mode uses them to
 * lock the page while playing and to return to the play checkpoint on exit.
 */
export const scrollBridge = {
  toStation: (_index: number) => {},
  lock: (_locked: boolean) => {},
}
