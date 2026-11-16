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

// --- leave the game, then look at the expanded tribute
await page.keyboard.press('Escape')
await page.waitForTimeout(600)
await page.keyboard.press('Escape')
await page.waitForTimeout(1800)
await page.evaluate(() => {
  const el = document.querySelector('[data-station="11"]')
  window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
})
await page.waitForTimeout(1200)
await page.screenshot({ path: 'shots/jump-08-tribute-1440.png', fullPage: false })

const groups = await page.evaluate(() => {
  const card = [...document.querySelectorAll('h2')].find((h) => /Tribute/i.test(h.textContent))
  const root = card?.parentElement
  return {
    groups: root ? root.querySelectorAll('section').length : 0,
    links: root ? root.querySelectorAll('a[href]').length : 0,
    mono: root ? root.querySelectorAll('li.font-mono').length : 0,
  }
})
console.log('tribute', groups)

// --- phone: tribute collapses to one column, no overflow
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(900)
await page.evaluate(() => {
  const el = document.querySelector('[data-station="11"]')
  window.scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
})
await page.waitForTimeout(900)
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
console.log('phone horizontal overflow', overflow)
await page.screenshot({ path: 'shots/jump-09-tribute-390.png' })

console.log('console errors', errors)
await browser.close()