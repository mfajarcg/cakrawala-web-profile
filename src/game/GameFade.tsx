import { useGame } from './store'

/** full-screen cover that hides the scene swap between site and game */
export function GameFade() {
  const cover = useGame((s) => s.cover)
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[60] bg-[#0b1216] transition-opacity duration-300 ${
        cover ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    />
  )
}
