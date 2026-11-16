import { chromium } from 'playwright-core'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
await page.goto('http://localhost:5199/cakrawala-web-profile/', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
const cdp = await ctx.newCDPSession(page)
const swipe = async (fromY, toY, steps = 12, x = 195) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] })
  for (let i = 1; i <= steps; i++) {
    const y = fromY + ((toY - fromY) * i) / steps
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
const state = () => page.evaluate(() => {
  const stations = [...document.querySelectorAll('[data-station]')].map(el => ({
    i: +el.dataset.station, top: el.offsetTop + (el.offsetHeight - innerHeight) / 2,
  }))
  let best = null
  for (const s of stations) {
    const d = Math.abs(scrollY - s.top)
    if (!best || d < best.d) best = { ...s, d }
  }
  return { y: Math.round(scrollY), nearest: best.i, dist: Math.round(best.d) }
})
const results = []
const expect = (name, ok, s) => { results.push({ name, ok, ...s }); console.log(ok?'PASS':'FAIL', name, JSON.stringify(s)) }

// short swipe (~200px) must still advance one checkpoint, not rubber-band back
await swipe(600, 400)
await page.waitForTimeout(3200)
let s = await state()
expect('short swipe steps to station 2', s.nearest === 2 && s.dist < 32, s)

// swipe back up returns to station 1
await swipe(300, 620)
await page.waitForTimeout(3200)
s = await state()
expect('swipe up returns to station 1', s.nearest === 1 && s.dist < 32, s)

// long fast swipe spanning several stations lands locked on a checkpoint, never behind start
// (x=120: a clear content lane — the bottom-right corner is the draggable PiP surface)
await swipe(780, 60, 8, 120)
await page.waitForTimeout(3600)
s = await state()
expect('long swipe lands locked ahead', s.dist < 32 && s.nearest >= 2, s)

// a new finger mid-hop cancels the animation and takes over
await swipe(700, 200)
await page.waitForTimeout(500) // hop animation running
await swipe(700, 250)
await page.waitForTimeout(3600)
s = await state()
expect('touch takeover settles locked', s.dist < 32, s)

// tap (no displacement) must not jump stations
const before = await state()
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 400 }] })
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
await page.waitForTimeout(1200)
s = await state()
expect('tap keeps checkpoint', s.nearest === before.nearest && s.dist < 32, s)

console.log('pageerrors', errors)
console.log(results.every(r => r.ok) && errors.length === 0 ? 'TOUCH_OK' : 'TOUCH_FAIL')
await browser.close()
