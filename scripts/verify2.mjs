// Focused checks: gait + shadow on the site, wheel-up snap, wheel burst, teleport jump, jump, break, persistence.
import { chromium } from 'playwright-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const url = 'http://localhost:5199/cakrawala-web-profile/'
const browser = await chromium.launch({ executablePath: EDGE, headless: true })

const errors = []
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const clickNav = (label) =>
  page.evaluate((label) => {
    const btn = [...document.querySelectorAll('header button')].find(
      (b) => b.textContent.trim() === label,
    )
    btn?.click()
  }, label)
const stationOfScroll = () =>
  page.evaluate(() => {
    const tops = [...document.querySelectorAll('[data-station]')].map((el) =>
      Math.round(el.offsetTop + (el.offsetHeight - innerHeight) / 2),
    )
    const y = Math.round(window.scrollY)
    return { y, index: tops.findIndex((t) => Math.abs(t - y) < 10) }
  })
const count = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('cakrawala-play-world-v1') ?? '[]').length)

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

// hide the DOM cards so the character is fully visible
await page.evaluate(() => {
  document.querySelectorAll('section > div').forEach((el) => {
    el.style.visibility = 'hidden'
  })
  const header = document.querySelector('header')
  if (header) header.style.visibility = 'hidden'
})

await page.keyboard.press('ArrowDown')
await page.waitForTimeout(600)
await page.screenshot({ path: 'shots/gait-01.png' })
await page.waitForTimeout(170)
await page.screenshot({ path: 'shots/gait-02.png' })

// let the hop finish, then jump to station 4 for a station-side gait frame
await page.waitForTimeout(2600)
await clickNav('Kredibilitas')
await page.waitForTimeout(3600)
await page.screenshot({ path: 'shots/gait-03-station4.png' })

// wheel up must lock back one checkpoint
const before = await stationOfScroll()
await page.evaluate(() =>
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true })),
)
await page.waitForTimeout(2900)
console.log('wheel up', { before: before.index, ...(await stationOfScroll()) })

// natural multi-notch gesture: extra notches during the hop must be swallowed,
// never kill the running hop (Lenis animate.stop-on-wheel regression)
const burstStart = await stationOfScroll()
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(90)
}
await page.waitForTimeout(2600)
const burstEnd = await stationOfScroll()
console.log('wheel burst', {
  from: burstStart.index,
  to: burstEnd.index,
  ok: burstEnd.index === burstStart.index + 1,
})

// a skip of two+ stations lands immediately so the teleport starts at the true origin
await clickNav('Kontak')
await page.waitForTimeout(120)
const tp = await stationOfScroll()
console.log('teleport jump', { ...tp, immediate: tp.index >= 0 })
await page.waitForTimeout(1200)

// --- game: jump, build, break, persistence
await page.evaluate(() => {
  document.querySelectorAll('section > div').forEach((el) => {
    el.style.visibility = ''
  })
  const header = document.querySelector('header')
  if (header) header.style.visibility = ''
})
await page.waitForTimeout(200)
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
console.log('at play', await stationOfScroll())

await page.evaluate(() => localStorage.removeItem('cakrawala-play-world-v1'))
await page.getByRole('button', { name: /Play Character/i }).click()
await page.getByRole('button', { name: /Tetap masuk/i }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'shots/game-01-start.png' })

await page.keyboard.press('Space')
await page.waitForTimeout(230)
await page.screenshot({ path: 'shots/game-02-jump.png' })
await page.waitForTimeout(700)

await page.mouse.click(720, 450)
await page.waitForTimeout(400)
const seeded = await count()
await page.mouse.click(720, 450, { button: 'right' })
await page.waitForTimeout(400)
const placed = await count()
await page.mouse.click(720, 450)
await page.waitForTimeout(400)
const broke = await count()
console.log('blocks', { seeded, placed, broke })
await page.screenshot({ path: 'shots/game-03-built.png' })

// Esc pauses, a second Esc leaves the playground
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
console.log('after esc one', await page.evaluate(() => ({ dialog: !!document.querySelector('[role="dialog"]'), locked: !!document.pointerLockElement })))
await page.keyboard.press('Escape')
await page.waitForTimeout(1500)
console.log('after exit', await page.evaluate(() => ({ y: Math.round(scrollY), overflow: document.body.style.overflow })))

// reload keeps the build
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2400)
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /Play Character/i }).click()
await page.getByRole('button', { name: /Tetap masuk/i }).click()
await page.waitForTimeout(1500)
console.log('after reload blocks', await count())
await page.screenshot({ path: 'shots/game-04-reload.png' })

console.log('errors', errors)
await browser.close()
