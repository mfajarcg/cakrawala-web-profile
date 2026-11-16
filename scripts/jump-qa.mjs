// QA for the countermovement jump pose + the expanded footer tribute.
// Usage: node scripts/jump-qa.mjs [url]
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

const clickNav = (label) =>
  page.evaluate((label) => {
    const btn = [...document.querySelectorAll('header button')].find(
      (b) => b.textContent.trim() === label,
    )
    btn?.click()
  }, label)

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2400)
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /Play Character/i }).click()
await page.waitForTimeout(1600)

// --- one jump, sampled across the four CMJ phases
await page.keyboard.press('Space')
await page.waitForTimeout(100)
await page.screenshot({ path: 'shots/jump-01-crouch.png' })
await page.waitForTimeout(300) // t=400 rise
await page.screenshot({ path: 'shots/jump-02-rise.png' })
await page.waitForTimeout(300) // t=700 fall
await page.screenshot({ path: 'shots/jump-03-fall.png' })
await page.waitForTimeout(250) // t=950 landing absorption
await page.screenshot({ path: 'shots/jump-04-land.png' })
await page.waitForTimeout(450) // t=1400 back to idle
await page.screenshot({ path: 'shots/jump-05-idle.png' })

// --- repeated jumps must not stick or corrupt the pose
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Space')
  await page.waitForTimeout(1200)
}
await page.screenshot({ path: 'shots/jump-06-repeat.png' })

// --- running jump: stride blends into tuck without foot-slide
await page.keyboard.down('ShiftLeft')
await page.keyboard.down('KeyW')
await page.waitForTimeout(700)
await page.keyboard.press('Space')
await page.waitForTimeout(420)
await page.screenshot({ path: 'shots/jump-07-run-rise.png' })
await page.keyboard.up('KeyW')
await page.keyboard.up('ShiftLeft')
await page.waitForTimeout(1200)

// --- leave the game, then open the full-screen tribute from the footer
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
await page.keyboard.press('Escape')
await page.waitForTimeout(1800)
await page.evaluate(() => {
  const el = document.querySelector('[data-station="11"]')
  window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
})
await page.waitForTimeout(2600)
await page.click('[data-tribute-open]')
await page.waitForTimeout(900)
await page.screenshot({ path: 'shots/jump-08-tribute-1440.png' })

const groups = await page.evaluate(() => {
  const root = document.querySelector('[role="dialog"]')
  const r = root?.getBoundingClientRect()
  return {
    groups: root ? root.querySelectorAll('section').length : 0,
    links: root ? root.querySelectorAll('a[href]').length : 0,
    mono: root ? root.querySelectorAll('li.font-mono').length : 0,
    full: r ? r.width === innerWidth && r.height === innerHeight : false,
  }
})
console.log('tribute', groups)

// real wheel must scroll the tribute pane, never the page behind it
const yBefore = await page.evaluate(() => window.scrollY)
const topBefore = await page.evaluate(() => document.querySelector('.tribute-scroll').scrollTop)
await page.mouse.wheel(0, 300)
await page.waitForTimeout(400)
const wheel = await page.evaluate(
  ([y, t]) => ({
    inner: document.querySelector('.tribute-scroll').scrollTop > t,
    pageStill: window.scrollY === y,
    paneFocused: document.activeElement?.classList.contains('tribute-scroll') ?? false,
  }),
  [yBefore, topBefore],
)
console.log('wheel scrolls tribute only', wheel)

// rail jump lands the last group below the sticky header
await page.getByRole('button', { name: /Rumus fisika & integrasi/ }).click()
await page.waitForTimeout(900)
await page.screenshot({ path: 'shots/jump-08b-tribute-rail.png' })

// Esc closes and walks back to the section the tribute was opened from
await page.keyboard.press('Escape')
await page.waitForTimeout(2300)
const back = await page.evaluate(() => {
  const el = document.querySelector('[data-station="11"]')
  const top = el.offsetTop + (el.offsetHeight - innerHeight) / 2
  return {
    near: Math.abs(window.scrollY - top) < 40,
    dialogGone: !document.querySelector('[role="dialog"]'),
  }
})
console.log('close returns to previous section', back)

// --- phone: full-screen tribute, one column, no overflow
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(2200)
await page.click('[data-tribute-open]')
await page.waitForTimeout(900)
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
console.log('phone horizontal overflow', overflow)
await page.screenshot({ path: 'shots/jump-09-tribute-390.png' })
await page.evaluate(() => {
  const el = document.querySelector('.tribute-scroll')
  el.scrollTop = el.scrollHeight
})
await page.waitForTimeout(700)
await page.screenshot({ path: 'shots/jump-09b-tribute-390-bottom.png' })
await page.getByRole('button', { name: 'Tutup', exact: true }).click()
await page.waitForTimeout(2300)
const backPhone = await page.evaluate(() => {
  const el = document.querySelector('[data-station="11"]')
  const top = el.offsetTop + (el.offsetHeight - innerHeight) / 2
  return Math.abs(window.scrollY - top) < 40
})
console.log('phone close returns to previous section', backPhone)

console.log('console errors', errors)
await browser.close()