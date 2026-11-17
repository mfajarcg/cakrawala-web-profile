/**
 * Quiet, synthesized feedback for the playground — every sound is tied to
 * something visible: a block seating, a foundation giving way, the horizon
 * opening. No assets, no loop, nothing that reads as noise.
 */
const MUTE_KEY = 'cakrawala-audio-v1'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
try {
  muted = localStorage.getItem(MUTE_KEY) === 'off'
} catch {
  // storage unavailable — sound stays on for this session
}

const listeners = new Set<() => void>()

function ensure() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  const c = ensure()
  if (!c || !master || muted) return
  const t = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise(dur: number, gain: number, cutoff: number) {
  const c = ensure()
  if (!c || !master || muted) return
  const t = c.currentTime
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = cutoff
  const g = c.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(master)
  src.start(t)
}

export const audio = {
  get muted() {
    return muted
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  toggle() {
    muted = !muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on')
    } catch {
      // ignore
    }
    if (master) master.gain.value = muted ? 0 : 0.5
    listeners.forEach((fn) => fn())
    if (!muted) tone(660, 0.12, 'sine', 0.25)
  },
  place() {
    tone(196, 0.16, 'triangle', 0.5, -60)
    noise(0.07, 0.16, 900)
  },
  break() {
    noise(0.16, 0.3, 1600)
    tone(140, 0.12, 'square', 0.12, -50)
  },
  deny() {
    tone(150, 0.14, 'sine', 0.3, -40)
  },
  collapse() {
    noise(0.4, 0.4, 700)
    tone(98, 0.4, 'triangle', 0.4, -40)
  },
  complete() {
    const seq = [392, 494, 587, 784]
    seq.forEach((f, i) => window.setTimeout(() => tone(f, 0.5, 'sine', 0.32), i * 110))
  },
  vista() {
    tone(262, 1.4, 'sine', 0.22, 130)
    tone(392, 1.4, 'sine', 0.14, 196)
  },
  record() {
    const seq = [587, 784, 988, 1175]
    seq.forEach((f, i) => window.setTimeout(() => tone(f, 0.4, 'triangle', 0.3), i * 90))
  },
  timeWarn() {
    tone(880, 0.09, 'square', 0.16)
  },
  timeout() {
    tone(220, 0.5, 'sawtooth', 0.26, -140)
    noise(0.4, 0.24, 800)
  },
  teleport() {
    noise(0.3, 0.2, 2600)
    tone(720, 0.34, 'sine', 0.16, -520)
    window.setTimeout(() => {
      tone(240, 0.4, 'sine', 0.22, 480)
      noise(0.12, 0.12, 1200)
    }, 480)
  },
}