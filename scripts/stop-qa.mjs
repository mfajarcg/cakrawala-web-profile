// Checkpoint landing QA: the walk must stop exactly on the checkpoint target
// without overshooting, turning around, or walking back.
// Usage: node scripts/stop-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('shots', { recursive: true })
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
const pos = () => page.evaluate(() => window.__jdebug.pos())

async function hop(label, fn) {
  const start = await pos()
  await fn()
  const series = []
  for (let i = 0; i < 400; i++) {
    series.push(await pos())
    await page.waitForTimeout(150)
    if (i > 20) {
      const a = series[i - 6]
      const b = series[i]
      // a turn-in-place also freezes position: only rest once progress arrived
      const at = await page.evaluate(() => {
        const c = window.__cdebug
        return Math.abs(c.target() - c.sim.progress) < 1e-4
      })
      if (at && Math.hypot(b.x - a.x, b.z - a.z) < 0.008) break
    }
  }
  const final = series[series.length - 1]
  const dx = final.x - start.x
  const dz = final.z - start.z
  const len = Math.hypot(dx, dz) || 1
  const dir = { x: dx / len, z: dz / len }
  const overshoot = Math.max(
    ...series.map((p) => (p.x - final.x) * dir.x + (p.z - final.z) * dir.z),
  )
  let near = false
  let back = 0
  for (let i = 1; i < series.length; i++) {
    if (Math.hypot(series[i].x - final.x, series[i].z - final.z) < 0.15) near = true
    if (near) {
      const mv =
        (series[i].x - series[i - 1].x) * dir.x + (series[i].z - series[i - 1].z) * dir.z
      if (mv < -0.005) back += -mv
    }
  }
  const exact = await page.evaluate(() => {
    const c = window.__cdebug
    const t = c.at(c.target())
    const p = window.__jdebug.pos()
    return +Math.hypot(p.x - t[0], p.z - t[2]).toFixed(4)
  })
  const last = series[series.length - 1]
  const prev = series[series.length - 5]
  const rest = Math.hypot(last.x - prev.x, last.z - prev.z)
  const ok = overshoot < 0.05 && back < 0.05 && rest < 0.02 && exact < 0.02
  console.log(ok ? 'PASS' : 'FAIL', label, {
    overshoot: +overshoot.toFixed(3),
    back: +back.toFixed(3),
    rest: +rest.toFixed(4),
    exact,
    moved: +len.toFixed(2),
  })
}

const wheel = (dy) =>
  page.evaluate(
    (dy) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true })),
    dy,
  )
await hop('wheel snap to station 2', () => wheel(120))
await hop('wheel snap to station 3', () => wheel(120))
await hop('wheel back to station 2', () => wheel(-120))
await hop('nav click Layanan', () =>
  page.evaluate(() => {
    const btn = [...document.querySelectorAll('header button')].find(
      (b) => b.textContent.trim() === 'Layanan',
    )
    btn?.click()
  }),
)
await page.screenshot({ path: 'shots/stop-final.png' })

console.log('console errors', errors)
await browser.close()