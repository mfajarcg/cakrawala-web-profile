// Split-layout QA: desktop left substance column + right 3D pane, mobile
// full-width content + draggable PiP. Usage: node scripts/layout-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
await mkdir('shots', { recursive: true })

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const results = []
const expect = (name, ok, extra = {}) => {
  results.push({ name, ok })
  console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(extra))
}
const errors = []

// ---------- desktop 1440 ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (e) => errors.push('desktop: ' + e))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)

  const geo = await page.evaluate(() => {
    const pane = document.querySelector('canvas')?.closest('.fixed')
    const r = pane?.getBoundingClientRect()
    const sec = document.querySelector('#hero')?.getBoundingClientRect()
    const canvas = document.querySelector('canvas')
    return {
      pane: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      section: sec && { w: Math.round(sec.width) },
      canvas: canvas && { w: canvas.width, h: canvas.height },
      overflowX: document.documentElement.scrollWidth - innerWidth,
      pip: !!document.querySelector('[data-pip]'),
    }
  })
  expect('desktop pane occupies right 54%, full height',
    geo.pane && Math.abs(geo.pane.x - 662) < 4 && geo.pane.w > 700 && geo.pane.h === 900, geo)
  expect('desktop substance column ~46%', geo.section && Math.abs(geo.section.w - 662) < 4, geo)
  expect('canvas sized to pane', geo.canvas && geo.canvas.w > 700 && geo.canvas.h > 800, geo)
  expect('no horizontal overflow', geo.overflowX <= 0, geo)
  expect('no PiP on desktop', !geo.pip, geo)
  const railCount = await page.evaluate(() => document.querySelectorAll('button[title^="Etape"]').length)
  expect('station rail has 11 dots', railCount === 11, { railCount })
  await page.screenshot({ path: 'shots/layout-1440-hero.png' })

  // rail jump to station 5
  await page.evaluate(() => document.querySelectorAll('button[title^="Etape"]')[4].click())
  await page.waitForTimeout(3200)
  const afterRail = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-station]')]
    let best = null
    for (const el of els) {
      const top = el.offsetTop + (el.offsetHeight - innerHeight) / 2
      const d = Math.abs(scrollY - top)
      if (!best || d < best.d) best = { i: +el.dataset.station, d }
    }
    return { y: Math.round(scrollY), nearest: best.i, dist: Math.round(best.d) }
  })
  expect('rail click lands on station 5', afterRail.nearest === 5 && afterRail.dist < 32, afterRail)
  await page.screenshot({ path: 'shots/layout-1440-numbers.png' })

  // PoV toggle lives inside the pane
  const povBefore = await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    const btn = [...pane.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))
    if (!btn) return null
    const before = btn.getAttribute('aria-pressed')
    btn.click()
    return { before, inPane: pane.contains(btn) }
  })
  await page.waitForTimeout(500)
  const povAfter = await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    return [...pane.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))?.getAttribute('aria-pressed')
  })
  expect('PoV button inside pane toggles', povBefore && povBefore.inPane && povBefore.before !== povAfter, { ...povBefore, after: povAfter })
  await page.screenshot({ path: 'shots/layout-1440-fp.png' })
  await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    ;[...pane.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))?.click()
  })
  await page.waitForTimeout(500)

  // wheel still steps checkpoints with the split layout
  await page.mouse.move(300, 450)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(3000)
  const afterWheel = await page.evaluate(() => Math.round(scrollY))
  expect('wheel advances journey', afterWheel > afterRail.y + 200, { afterWheel, before: afterRail.y })

  // services grid + card clearance under the fixed nav at every station
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('header button')].find((b) => b.textContent.trim() === 'Layanan')
    btn?.click()
  })
  await page.waitForTimeout(3400)
  const services = await page.evaluate(() => {
    const ul = document.querySelector('#services ul')
    const cols = getComputedStyle(ul).gridTemplateColumns.split(' ').length
    const card = document.querySelector('#services > div').getBoundingClientRect()
    return { cols, cardTop: Math.round(card.top), cardBottom: Math.round(card.bottom), vh: innerHeight }
  })
  expect('services grid adapts to column width', services.cols >= 2, services)
  await page.screenshot({ path: 'shots/layout-1440-services.png' })

  const clearance = []
  for (const id of ['hero', 'story', 'services', 'credibility', 'numbers', 'signature', 'market', 'about', 'play', 'contact', 'footer']) {
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
    }, id)
    await page.waitForTimeout(450)
    const m = await page.evaluate((id) => {
      const card = document.querySelector(`#${id} > div`).getBoundingClientRect()
      return { id, top: Math.round(card.top), bottom: Math.round(card.bottom), h: Math.round(card.height) }
    }, id)
    clearance.push(m)
  }
  const clipped = clearance.filter((c) => c.top < 56 || c.bottom > 900)
  expect('every card clears nav and viewport at 1440x900', clipped.length === 0, { clipped, clearance })

  // game mode still takes the full screen
  await page.evaluate(() => {
    const el = document.getElementById('play')
    scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
  })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    ;[...document.querySelectorAll('#play button')].find((b) => b.className.includes('f2b23c'))?.click()
  })
  await page.waitForTimeout(1800)
  const gameGeo = await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    const r = pane.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), z: getComputedStyle(pane).zIndex, pip: !!document.querySelector('[data-pip]') }
  })
  expect('game mode fullscreen above content', gameGeo.x === 0 && gameGeo.y === 0 && gameGeo.w === 1440 && gameGeo.h === 900 && gameGeo.z === '10', gameGeo)
  await page.screenshot({ path: 'shots/layout-1440-game.png' })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1600)
  const backGeo = await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    const r = pane.getBoundingClientRect()
    return { x: Math.round(r.x), w: Math.round(r.width) }
  })
  expect('exit game returns to split pane', Math.abs(backGeo.x - 662) < 4 && backGeo.w > 700, backGeo)
  await page.close()
}

// ---------- mobile 390 ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push('mobile: ' + e))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)

  const pip0 = await page.evaluate(() => {
    const el = document.querySelector('[data-pip]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const sec = document.querySelector('#hero').getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), secW: Math.round(sec.width), overflowX: document.documentElement.scrollWidth - innerWidth }
  })
  expect('mobile PiP present, compact, inside viewport',
    pip0 && pip0.w > 120 && pip0.w < 230 && pip0.x >= 0 && pip0.y >= 0 && pip0.x + pip0.w <= 390 && pip0.y + pip0.h <= 844, pip0)
  expect('mobile content full width', pip0 && pip0.secW === 390, pip0)
  expect('mobile no horizontal overflow', pip0 && pip0.overflowX <= 0, pip0)
  await page.screenshot({ path: 'shots/layout-390-hero.png' })

  // drag the PiP by its header so the frame lands at (60, 120)
  const header = await page.evaluate(() => {
    const el = document.querySelector('[data-pip] > div')
    const r = el.getBoundingClientRect()
    const frame = document.querySelector('[data-pip]').getBoundingClientRect()
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, offX: r.x + r.width / 2 - frame.x, offY: r.y + r.height / 2 - frame.y }
  })
  await page.mouse.move(header.cx, header.cy)
  await page.mouse.down()
  const tx = 60 + header.offX, ty = 120 + header.offY
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(header.cx + ((tx - header.cx) * i) / 10, header.cy + ((ty - header.cy) * i) / 10)
    await page.waitForTimeout(16)
  }
  await page.mouse.up()
  await page.waitForTimeout(300)
  const pip1 = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y) }
  })
  expect('PiP drags to new position', Math.abs(pip1.x - 60) < 8 && Math.abs(pip1.y - 120) < 8, pip1)

  // drag far beyond the edge — must clamp inside the viewport
  await page.mouse.move(pip1.x + 80, pip1.y + 12)
  await page.mouse.down()
  await page.mouse.move(-400, -400, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  const pipClamp = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  expect('PiP clamps at viewport edge', pipClamp.x >= 0 && pipClamp.y >= 0 && pipClamp.x + pipClamp.w <= 390 && pipClamp.y + pipClamp.h <= 844, pipClamp)
  await page.screenshot({ path: 'shots/layout-390-dragged.png' })

  // expand / collapse
  await page.evaluate(() => document.querySelector('[data-pip] button[aria-label]').click())
  await page.waitForTimeout(400)
  const pipExp = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y), h: Math.round(r.height) }
  })
  expect('PiP expands to ~86vw and stays inside', pipExp.w > 300 && pipExp.x >= 0 && pipExp.x + pipExp.w <= 390 && pipExp.y + pipExp.h <= 844, pipExp)
  await page.screenshot({ path: 'shots/layout-390-expanded.png' })
  await page.evaluate(() => document.querySelector('[data-pip] button[aria-label]').click())
  await page.waitForTimeout(300)

  // position persists across reload
  const savedPos = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y) }
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2400)
  const pipReload = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y) }
  })
  expect('PiP position persists after reload', Math.abs(pipReload.x - savedPos.x) < 4 && Math.abs(pipReload.y - savedPos.y) < 4, { savedPos, pipReload })

  // PoV button works inside the PiP
  const povBeforeM = await page.evaluate(() => {
    const pip = document.querySelector('[data-pip]')
    const btn = [...pip.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))
    if (!btn) return null
    const before = btn.getAttribute('aria-pressed')
    btn.click()
    return before
  })
  await page.waitForTimeout(500)
  const povAfterM = await page.evaluate(() => {
    const pip = document.querySelector('[data-pip]')
    return [...pip.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))?.getAttribute('aria-pressed')
  })
  expect('PoV toggle inside PiP', povBeforeM != null && povBeforeM !== povAfterM, { before: povBeforeM, after: povAfterM })
  await page.evaluate(() => {
    const pip = document.querySelector('[data-pip]')
    ;[...pip.querySelectorAll('button')].find((b) => b.getAttribute('aria-label')?.startsWith('PoV'))?.click()
  })

  // swipe on content advances the journey; swipe starting on the PiP does not
  const cdp = await ctx.newCDPSession(page)
  const swipe = async (x, fromY, toY, steps = 12) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] })
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY + ((toY - fromY) * i) / steps }] })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const nearest = () => page.evaluate(() => {
    let best = null
    for (const el of document.querySelectorAll('[data-station]')) {
      const top = el.offsetTop + (el.offsetHeight - innerHeight) / 2
      const d = Math.abs(scrollY - top)
      if (!best || d < best.d) best = { i: +el.dataset.station, d }
    }
    return { i: best.i, d: Math.round(best.d), y: Math.round(scrollY) }
  })
  // move PiP out of the swipe lane first (drag to top-right corner)
  const hdr = await page.evaluate(() => {
    const r = document.querySelector('[data-pip] > div').getBoundingClientRect()
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
  })
  await page.mouse.move(hdr.cx, hdr.cy)
  await page.mouse.down()
  await page.mouse.move(330, 70, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const beforeSwipe = await nearest()
  await swipe(120, 600, 380)
  await page.waitForTimeout(3200)
  const afterSwipe = await nearest()
  expect('content swipe steps one checkpoint', afterSwipe.i === beforeSwipe.i + 1 && afterSwipe.d < 32, { beforeSwipe, afterSwipe })

  const pipBox = await page.evaluate(() => {
    const r = document.querySelector('[data-pip]').getBoundingClientRect()
    return { cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) }
  })
  const beforePipSwipe = await nearest()
  await swipe(pipBox.cx, pipBox.cy + 40, pipBox.cy - 60)
  await page.waitForTimeout(2600)
  const afterPipSwipe = await nearest()
  expect('swipe on PiP does not hijack journey', afterPipSwipe.i === beforePipSwipe.i && afterPipSwipe.d < 32, { beforePipSwipe, afterPipSwipe })
  await page.screenshot({ path: 'shots/layout-390-station2.png' })

  // entering play hides the PiP and goes fullscreen; exiting restores it
  await page.evaluate(() => {
    const el = document.getElementById('play')
    scrollTo(0, el.offsetTop + (el.offsetHeight - innerHeight) / 2)
  })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    ;[...document.querySelectorAll('#play button')].find((b) => b.className.includes('f2b23c'))?.click()
  })
  await page.waitForTimeout(1800)
  const gameMobile = await page.evaluate(() => {
    const pane = document.querySelector('canvas').closest('.fixed')
    const r = pane.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), pip: !!document.querySelector('[data-pip]') }
  })
  expect('mobile game fullscreen, PiP hidden', gameMobile.w === 390 && gameMobile.h === 844 && !gameMobile.pip, gameMobile)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1800)
  const pipBack = await page.evaluate(() => !!document.querySelector('[data-pip]'))
  expect('PiP restored after exiting game', pipBack)
  await ctx.close()
}

// ---------- breakpoint boundary ----------
for (const [w, wantPip] of [[767, true], [768, false]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const hasPip = await page.evaluate(() => !!document.querySelector('[data-pip]'))
  expect(`breakpoint ${w}px → ${wantPip ? 'PiP' : 'pane'}`, hasPip === wantPip, { hasPip })
  await page.close()
}

console.log('pageerrors:', errors)
console.log(results.every((r) => r.ok) && errors.length === 0 ? 'LAYOUT_OK' : 'LAYOUT_FAIL')
await browser.close()