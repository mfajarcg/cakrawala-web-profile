// Interactive QA for the Play Character mode + checkpoint snapping.
// Usage: node scripts/play-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('shots', { recursive: true })
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

const clickNav = (label) =>
  page.evaluate((label) => {
    const btn = [...document.querySelectorAll('header button')].find(
      (b) => b.textContent.trim() === label,
    )
    btn?.click()
  }, label)

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

// --- wheel must lock one checkpoint per gesture
const before = await page.evaluate(() => window.scrollY)
await page.evaluate(() => {
  window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }))
})
await page.waitForTimeout(2900)
const afterWheel = await page.evaluate(() => {
  const el = document.querySelector('[data-station="2"]')
  return { scrollY: window.scrollY, top: el ? el.offsetTop + (el.offsetHeight - innerHeight) / 2 : -1 }
})
console.log('wheel snap', { before, ...afterWheel, delta: afterWheel.scrollY - afterWheel.top })

// --- services panel is wide enough for 3 columns
await clickNav('Layanan')
await page.waitForTimeout(3600)
const cols = await page.evaluate(() => {
  const list = document.querySelector('#services ul')
  return list ? getComputedStyle(list).gridTemplateColumns.split(' ').length : 0
})
console.log('services columns', cols)
await page.screenshot({ path: 'shots/qa-01-services.png' })

// --- go to the play checkpoint
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
await page.screenshot({ path: 'shots/qa-02-play-panel.png' })

// --- enter the game
await page.evaluate(() => localStorage.removeItem('cakrawala-play-world-v1'))
await page.getByRole('button', { name: /Play Character/i }).click()
await page.waitForTimeout(1600)
await page.screenshot({ path: 'shots/qa-03-game.png' })
const mode = await page.evaluate(() => document.body.style.overflow)
console.log('game mode body overflow', JSON.stringify(mode))

// --- walk forward
await page.keyboard.down('KeyW')
await page.waitForTimeout(900)
await page.keyboard.up('KeyW')
await page.waitForTimeout(300)
await page.screenshot({ path: 'shots/qa-04-walk.png' })

// --- lock the camera, then place a block with the crosshair
await page.mouse.click(720, 450)
await page.waitForTimeout(800)
const locked = await page.evaluate(() => !!document.pointerLockElement)
console.log('pointer locked', locked)
await page.mouse.click(720, 450, { button: 'right' })
await page.waitForTimeout(500)
const saved = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('cakrawala-play-world-v1') ?? '[]'),
)
console.log('blocks after place', saved.length, saved[0])
await page.screenshot({ path: 'shots/qa-05-place.png' })

// --- escape returns to the checkpoint, build survives
await page.keyboard.press('Escape')
await page.waitForTimeout(1600)
const back = await page.evaluate(() => {
  const el = document.querySelector('[data-station="9"]')
  return {
    scrollY: window.scrollY,
    top: el ? el.offsetTop + (el.offsetHeight - innerHeight) / 2 : -1,
    overflow: document.body.style.overflow,
    hud: !!document.querySelector('[data-station="9"]'),
  }
})
console.log('back to checkpoint', back)
await page.screenshot({ path: 'shots/qa-06-back.png' })

// --- phone check
const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
await phone.goto(url, { waitUntil: 'networkidle' })
await phone.waitForTimeout(2400)
await phone.evaluate(() => {
  const btn = [...document.querySelectorAll('header button')].find(
    (b) => b.textContent.trim() === 'Layanan',
  )
  btn?.click()
})
await phone.waitForTimeout(3600)
await phone.screenshot({ path: 'shots/qa-07-phone-services.png' })

console.log('console errors', errors)
await browser.close()
