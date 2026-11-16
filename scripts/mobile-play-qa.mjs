// QA for Play mode on a touch phone (390x844, hasTouch/isMobile):
// no pointer lock, tap-to-aim reticle, tap/drag LookPad, place/break the tapped
// cell, hotbar selection, joystick movement, mute, pause/clear/resume/exit via
// pointer, and a non-overlapping touch HUD. Usage: node scripts/mobile-play-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('shots', { recursive: true })
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
})
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)

const errors = []
const failures = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

const world = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('cakrawala-play-world-v1') ?? '[]'))
const hasBlock = (w, x, y, z, kind) =>
  w.some((b) => b.x === x && b.y === y && b.z === z && (kind ? b.kind === kind : true))
const locked = () => page.evaluate(() => !!document.pointerLockElement)
const reticle = () =>
  page.evaluate(() => {
    const el = document.querySelector('[data-reticle]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
const hint = () => page.evaluate(() => !!document.querySelector('[data-touch-hint]'))
const player = () => page.evaluate(() => {
  const p = window.__gameDebug?.player
  return p ? { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch } : null
})

// raw touch drag (CDP) — used for the joystick and the look pad
const drag = async (fx, fy, tx, ty, steps = 10, hold = 0) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fx, y: fy }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: fx + ((tx - fx) * i) / steps, y: fy + ((ty - fy) * i) / steps }],
    })
    await page.waitForTimeout(16)
  }
  if (hold) await page.waitForTimeout(hold)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

// project a world point to screen pixels through the live play camera
const project = (wx, wy, wz) =>
  page.evaluate(([x, y, z]) => {
    const cam = window.__gameDebug?.camera
    const canvas = document.querySelector('canvas')
    if (!cam || !canvas) return null
    const r = canvas.getBoundingClientRect()
    const mul = (m, v) => {
      const o = [0, 0, 0, 0]
      for (let row = 0; row < 4; row++)
        o[row] = m[row] * v[0] + m[4 + row] * v[1] + m[8 + row] * v[2] + m[12 + row] * v[3]
      return o
    }
    const view = mul(cam.matrixWorldInverse.elements, [x, y, z, 1])
    const clip = mul(cam.projectionMatrix.elements, view)
    const nx = clip[0] / clip[3]
    const ny = clip[1] / clip[3]
    return { x: r.left + (nx * 0.5 + 0.5) * r.width, y: r.top + (0.5 - ny * 0.5) * r.height }
  }, [wx, wy, wz])

const tapButton = (name) => page.getByRole('button', { name, exact: true }).tap()

// --- boot and enter the playground -----------------------------------------
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.evaluate(() => {
  localStorage.removeItem('cakrawala-play-world-v1')
  localStorage.removeItem('cakrawala-meaning-v1')
  localStorage.removeItem('cakrawala-audio-v1')
})
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    b.textContent.includes('Play Character'),
  )
  btn?.click()
})
await page.waitForTimeout(1700)

check('enter game', await page.evaluate(() => document.body.style.overflow === 'hidden'))
check('coarse pointer detected', await page.evaluate(() => matchMedia('(pointer: coarse)').matches))
check('no pointer lock on touch', !(await locked()))

const hud = await page.evaluate(() => ({
  joystick: !!document.querySelector('[data-joystick]'),
  lookpad: !!document.querySelector('[data-lookpad]'),
  actions: !!document.querySelector('[data-actions]'),
  touchSlots: document.querySelectorAll('[data-hotbar="touch"] button').length,
  desktopHotbar: !!document.querySelector('[data-hotbar="desktop"]'),
}))
check('touch HUD present', hud.joystick && hud.lookpad && hud.actions && hud.touchSlots === 5 && !hud.desktopHotbar, JSON.stringify(hud))
await page.screenshot({ path: 'shots/mp-01-hud.png' })

// --- tap aims without ever taking the lock ---------------------------------
await page.touchscreen.tap(150, 260)
await page.waitForTimeout(220)
check('tap keeps lock off', !(await locked()))
let r = await reticle()
check('reticle at tap', r && Math.abs(r.x - 150) < 3 && Math.abs(r.y - 260) < 3, JSON.stringify(r))
check('hint hidden after aim', !(await hint()))
await page.touchscreen.tap(110, 320)
await page.waitForTimeout(220)
r = await reticle()
check('reticle follows re-aim', r && Math.abs(r.x - 110) < 3 && Math.abs(r.y - 320) < 3, JSON.stringify(r))
await page.screenshot({ path: 'shots/mp-02-reticle.png' })

// --- pause / clear / resume all work by touch ------------------------------
await tapButton('Menu')
await page.waitForTimeout(400)
check('Menu opens pause', await page.evaluate(() => !!document.querySelector('[role="dialog"]')))
check('pause keeps lock off', !(await locked()))
await tapButton('Hapus semua')
await page.waitForTimeout(200)
await tapButton('Ya, hapus')
await page.waitForTimeout(400)
check('clear empties arena', (await world()).length === 0, JSON.stringify(await world()))
await page.screenshot({ path: 'shots/mp-03-pause.png' })
await tapButton('Lanjutkan')
await page.waitForTimeout(600)
check('resume closes pause', !(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))))
check('resume keeps lock off', !(await locked()))
check('resume restores hint', await hint())

// --- select a material, tap the ground, place the tapped cell --------------
await page.locator('[data-hotbar="touch"] button').nth(0).tap()
await page.waitForTimeout(200)
check('slot 0 selected', await page.locator('[data-hotbar="touch"] button').nth(0).getAttribute('aria-pressed') === 'true')
// ground cell (0,4): floor point world (104.5, 0.004, 4.0)
let g = await project(104.5, 0.004, 4.0)
check('ground projects on screen', g && g.x > 0 && g.x < 390 && g.y > 0 && g.y < 844, JSON.stringify(g))
await page.touchscreen.tap(g.x, g.y)
await page.waitForTimeout(200)
await tapButton('Pasang')
await page.waitForTimeout(400)
let w = await world()
check('place tapped ground cell', hasBlock(w, 0, 0, 4, 'server'), JSON.stringify(w))
await page.screenshot({ path: 'shots/mp-04-place.png' })

// --- tap a block face, stack on top ----------------------------------------
await page.locator('[data-hotbar="touch"] button').nth(1).tap()
await page.waitForTimeout(200)
check('slot 1 selected', await page.locator('[data-hotbar="touch"] button').nth(1).getAttribute('aria-pressed') === 'true')
const f = await project(104.5, 0.5, 4.48) // +Z face of the y0 block → stacks y1
await page.touchscreen.tap(f.x, f.y)
await page.waitForTimeout(200)
await tapButton('Pasang')
await page.waitForTimeout(400)
w = await world()
check('stack on tapped face', hasBlock(w, 0, 1, 4, 'cloud'), JSON.stringify(w))

// --- break the tapped block -------------------------------------------------
const b = await project(104.5, 1.5, 4.48) // +Z face of the y1 block
await page.touchscreen.tap(b.x, b.y)
await page.waitForTimeout(200)
await tapButton('Hancurkan')
await page.waitForTimeout(400)
w = await world()
check('break tapped block', w.length === 1 && hasBlock(w, 0, 0, 4) && !hasBlock(w, 0, 1, 4), JSON.stringify(w))
await page.screenshot({ path: 'shots/mp-05-break.png' })

// --- mute toggles and persists ---------------------------------------------
const mute = page.locator('button[aria-label^="Suara"]')
check('sound on by default', (await mute.getAttribute('aria-label')) === 'Suara: aktif')
await mute.tap()
await page.waitForTimeout(200)
check('mute persists', await page.evaluate(() => localStorage.getItem('cakrawala-audio-v1') === 'off'))
check('mute icon state', (await mute.getAttribute('aria-label')) === 'Suara: mati')
await mute.tap()
await page.waitForTimeout(200)
check('unmute restores', await page.evaluate(() => localStorage.getItem('cakrawala-audio-v1') !== 'off'))

// --- look pad: a drag turns the camera and clears the tap reticle ----------
await page.touchscreen.tap(150, 300)
await page.waitForTimeout(200)
check('aim set before look', !!(await reticle()))
const yawBefore = (await player()).yaw
await drag(300, 420, 250, 360, 10)
await page.waitForTimeout(300)
const yawAfter = (await player()).yaw
check('look drag turns camera', Math.abs(yawAfter - yawBefore) > 0.02, JSON.stringify({ yawBefore, yawAfter }))
check('look drag clears reticle', !(await reticle()))
check('look drag restores hint', await hint())

// --- joystick drives the player --------------------------------------------
const joy = await page.evaluate(() => {
  const r = document.querySelector('[data-joystick]').getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
})
const pBefore = await player()
await drag(joy.x, joy.y, joy.x, joy.y - 42, 6, 750)
await page.waitForTimeout(300)
const pAfter = await player()
const moved = Math.hypot(pAfter.x - pBefore.x, pAfter.z - pBefore.z)
check('joystick moves player', moved > 0.3, JSON.stringify({ moved: +moved.toFixed(2), pBefore, pAfter }))
await page.screenshot({ path: 'shots/mp-06-walk.png' })

// --- touch HUD clusters never overlap and stay on screen -------------------
const layout = await page.evaluate(() => {
  const sel = ['[data-joystick]', '[data-hotbar="touch"]', '[data-actions]']
  const rects = sel.map((s) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return { s, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
  })
  const top = document.querySelector('[data-topbar]').getBoundingClientRect()
  rects.push({ s: 'topbar', left: top.left, right: top.right, top: top.top, bottom: top.bottom })
  const overlaps = []
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 1 && oy > 1) overlaps.push([a.s, b.s, Math.round(ox), Math.round(oy)])
    }
  const off = rects.filter((r) => r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1)
  return { overlaps, off, overflowX: document.documentElement.scrollWidth > innerWidth + 1 }
})
check('HUD clusters do not overlap', layout.overlaps.length === 0, JSON.stringify(layout.overlaps))
check('HUD stays on screen', layout.off.length === 0 && !layout.overflowX, JSON.stringify(layout.off))

// --- exit returns to the journey, build persists ---------------------------
await tapButton('Menu')
await page.waitForTimeout(400)
await tapButton('Keluar')
await page.waitForTimeout(1800)
const back = await page.evaluate(() => ({
  overflow: document.body.style.overflow,
  blocks: JSON.parse(localStorage.getItem('cakrawala-play-world-v1') ?? '[]').length,
}))
check('exit keeps shared world', back.overflow !== 'hidden' && back.blocks === 1, JSON.stringify(back))
await page.screenshot({ path: 'shots/mp-07-journey.png' })

console.log('console errors', errors)
if (errors.length) failures.push('console errors')
console.log(failures.length === 0 ? 'MOBILE_PLAY_OK' : `MOBILE_PLAY_FAILURES: ${failures.join(', ')}`)
await browser.close()
process.exit(failures.length === 0 ? 0 : 1)