// QA for the rewritten run/walk joint curves: frozen side-profile poses at ten
// cycle positions, plus a live run from the game camera.
// Usage: node scripts/gait-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('shots', { recursive: true })
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2400)
await page.getByRole('button', { name: /Play Character/i }).click()
await page.waitForTimeout(1600)
await page.getByRole('button', { name: /Tetap masuk/i }).click()
await page.getByRole('button', { name: 'Menu', exact: true }).click()
await page.waitForTimeout(600)
await page.evaluate(() => {
  const hud = [...document.querySelectorAll('div')].find((d) => d.className.includes?.('z-40'))
  if (hud) hud.style.visibility = 'hidden'
})

// side profile, frozen: the pause path zeroes gait.moving every frame, so pin
// all gait fields behind accessors — GameScene writes become inert while the
// poser reads our frozen values
const GAIT_KEYS = ['phase', 'speedNorm', 'move01', 'moving', 'lift', 'jumpState', 'crouch', 'vy', 'airT', 'landT', 'impact']
await page.evaluate((keys) => {
  const { gait } = window.__gameDebug
  const frozen = {}
  for (const k of keys) {
    frozen[k] = gait[k]
    Object.defineProperty(gait, k, {
      configurable: true,
      get: () => frozen[k],
      set: () => {}, // GameScene keeps writing moving=0 while paused; ignore it
    })
  }
  window.__frozenGait = frozen
}, GAIT_KEYS)

await page.evaluate(() => {
  const { player, camera, characterPos } = window.__gameDebug
  const p = characterPos.current
  const fx = Math.sin(player.facing)
  const fz = Math.cos(player.facing)
  camera.position.set(p.x + fz * 2.3, 1.05, p.z - fx * 2.3)
  camera.lookAt(p.x, 0.98, p.z)
})

const pose = (u, sn) =>
  page.evaluate(
    ([u, sn]) => {
      const f = window.__frozenGait
      f.phase = u * Math.PI * 2
      f.speedNorm = sn
      f.moving = 1
      f.move01 = 1
      f.jumpState = 0
      f.lift = 0
      f.crouch = 0
      f.vy = 0
      f.airT = 0
      f.landT = 0
      f.impact = 0
    },
    [u, sn],
  )

for (const u of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
  await pose(u, 1)
  await page.waitForTimeout(160)
  await page.screenshot({ path: `shots/gait-run-${String(u * 10).padStart(2, '0')}.png` })
}
for (const u of [0, 0.3, 0.6]) {
  await pose(u, 0)
  await page.waitForTimeout(160)
  await page.screenshot({ path: `shots/gait-walk-${String(u * 10).padStart(2, '0')}.png` })
}

// live run from the chase camera: turnover and grip at real speed
await page.evaluate((keys) => {
  const { gait } = window.__gameDebug
  const f = window.__frozenGait
  for (const k of keys) {
    const v = f[k] ?? 0
    delete gait[k]
    gait[k] = v
  }
  delete window.__frozenGait
  const hud = [...document.querySelectorAll('div')].find((d) => d.className.includes?.('z-40'))
  if (hud) hud.style.visibility = ''
}, GAIT_KEYS)
await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
await page.waitForTimeout(700)
await page.keyboard.down('ShiftLeft')
await page.keyboard.down('KeyW')
await page.waitForTimeout(1300)
await page.screenshot({ path: 'shots/gait-live-run.png' })
await page.waitForTimeout(260)
await page.screenshot({ path: 'shots/gait-live-run-2.png' })
await page.keyboard.up('KeyW')
await page.keyboard.up('ShiftLeft')
await page.waitForTimeout(600)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await page.keyboard.press('Escape')
await page.waitForTimeout(1200)

console.log('console errors', errors)
await browser.close()