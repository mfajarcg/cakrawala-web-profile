// QA for the philosophical gameplay layer: ordered five-layer stack,
// foundation law rejection, cascade collapse, celebration + dawn, beacon
// raycast exclusion, renungan collection, audio mute, persistence, 390px HUD.
// Usage: node scripts/meaning-qa.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await mkdir('shots', { recursive: true })
const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

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
const meta = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('cakrawala-meaning-v1') ?? '{}'))
const toastText = () =>
  page.evaluate(() => document.querySelector('.notice-toast')?.textContent ?? '')
const hasBlock = (blocks, x, y, z, kind) =>
  blocks.some((b) => b.x === x && b.y === y && b.z === z && b.kind === kind)

const clickNav = (label) =>
  page.evaluate((label) => {
    const btn = [...document.querySelectorAll('header button')].find(
      (b) => b.textContent.trim() === label,
    )
    btn?.click()
  }, label)

// --- deterministic crosshair aim -------------------------------------------
// Player spawns at world (104.5, 0, 6.5) and never moves in this test.
// Camera: pos = P + (sin yaw, ·, cos yaw)·cosPitch·5.4, eyeY = 1.9 + sinPitch·5.4,
// lookAt P + (0, 1.15, 0). yaw -= movementX·0.0026, pitch += movementY·0.0022.
const P = { x: 104.5, z: 6.5 }
const look = { yaw: 0, pitch: 0.24 }
async function aimAt(fx, fy, fz) {
  const dx = fx - P.x
  const dz = fz - P.z
  const yawT = Math.atan2(-dx, -dz)
  const m = (fy - 1.15) / Math.hypot(dx, dz)
  const pitchT = Math.max(
    -0.4,
    Math.min(1.05, Math.asin(Math.max(-1, Math.min(1, -0.1388889 / Math.sqrt(1 + m * m)))) - Math.atan(m)),
  )
  // movementX/Y are longs: track the rounded deltas so error never accumulates
  const mx = Math.round((look.yaw - yawT) / 0.0026)
  const my = Math.round((pitchT - look.pitch) / 0.0022)
  look.yaw -= mx * 0.0026
  look.pitch = Math.max(-0.4, Math.min(1.05, look.pitch + my * 0.0022))
  await page.evaluate(
    ([mx, my]) =>
      document.dispatchEvent(new MouseEvent('mousemove', { movementX: mx, movementY: my })),
    [mx, my],
  )
  await page.waitForTimeout(160)
}
// down/up without a move: under pointer lock even a virtual mouse move
// injects real look deltas and would spoil the deterministic aim
const place = async () => {
  await page.mouse.down({ button: 'right' })
  await page.mouse.up({ button: 'right' })
  await page.waitForTimeout(320)
}
const breakBlock = async () => {
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(320)
}
const ensureLocked = async () => {
  for (let i = 0; i < 3; i++) {
    if (await page.evaluate(() => !!document.pointerLockElement)) return true
    await page.mouse.click(720, 450)
    await page.waitForTimeout(800)
  }
  return page.evaluate(() => !!document.pointerLockElement)
}

// column cell (0, -8): block centres (104.5, k+0.5, -8.0), +Z face at z=-7.52
const FACE_Z = -7.52
const GROUND_F = [104.5, 0.004, -8.0]
const faceF = (k) => [104.5, k - 0.5, FACE_Z] // front face of block y=k-1 → stacks y=k
const CANON = [
  ['1', 'server'],
  ['2', 'cloud'],
  ['3', 'doc'],
  ['4', 'laptop'],
  ['5', 'gear'],
]
async function buildColumn() {
  for (let k = 0; k < 5; k++) {
    await page.keyboard.press(CANON[k][0])
    const f = k === 0 ? GROUND_F : faceF(k)
    await aimAt(...f)
    await place()
  }
}

// --- boot and enter the playground -----------------------------------------
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.evaluate(() => {
  localStorage.removeItem('cakrawala-play-world-v1')
  localStorage.removeItem('cakrawala-meaning-v1')
  localStorage.removeItem('cakrawala-audio-v1')
})
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /Play Character/i }).click()
await page.getByRole('button', { name: /Tetap masuk/i }).click()
await page.waitForTimeout(1600)
check('enter game', await page.evaluate(() => document.body.style.overflow === 'hidden'))

// --- clear the starter build so the first-block aphorism can unlock --------
check('lock camera', await ensureLocked())
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
check('esc opens pause', await page.evaluate(() => !!document.querySelector('[role="dialog"]')))
const emptyRenungan = await page.evaluate(() => document.body.textContent.includes('Belum ada renungan'))
check('renungan empty state', emptyRenungan)
await page.getByRole('button', { name: /Hapus semua/i }).click()
await page.getByRole('button', { name: /Ya, hapus/i }).click()
await page.waitForTimeout(400)
check('arena cleared', (await world()).length === 0)
await page.getByRole('button', { name: /Lanjutkan/i }).click()
await page.waitForTimeout(900)
check('resume re-locks', await ensureLocked())

// --- build the ordered five-layer stack -------------------------------------
await page.keyboard.press('1')
await aimAt(...GROUND_F)
await place()
let w = await world()
check('foundation placed', hasBlock(w, 0, 0, -8, 'server'), JSON.stringify(w))
check('first aphorism', (await toastText()).includes('Fondasi pertama'))
await page.screenshot({ path: 'shots/mq-01-first.png' })

await page.keyboard.press('2')
await aimAt(...faceF(1))
await place()
w = await world()
check('craft stacked', hasBlock(w, 0, 1, -8, 'cloud'), JSON.stringify(w))
check('pair aphorism', (await toastText()).includes('Lapis demi lapis'))

for (let k = 2; k < 5; k++) {
  await page.keyboard.press(CANON[k][0])
  await aimAt(...faceF(k))
  await place()
}
w = await world()
check(
  'five layers ordered',
  CANON.every(([_, kind], k) => hasBlock(w, 0, k, -8, kind)),
  JSON.stringify(w),
)
await page.waitForTimeout(1500) // let the dawn light ease in
const celebrate = await page.evaluate(() => ({
  dialog: !!document.querySelector('[role="dialog"]'),
  title: document.querySelector('#meaning-title')?.textContent ?? '',
  locked: !!document.pointerLockElement,
  ladder: document.body.textContent.includes('Makna 5/5'),
}))
check('celebration card', celebrate.dialog && celebrate.title === 'Cakrawala terbuka', JSON.stringify(celebrate))
check('celebration frees cursor', !celebrate.locked)
check('ladder 5/5', celebrate.ladder)
await page.screenshot({ path: 'shots/mq-02-celebrate-dawn.png' })
const m1 = await meta()
check(
  'meta persisted',
  m1.done === true && m1.vista === true && m1.best === 5 &&
    ['first', 'pair', 'complete', 'vista'].every((k) => m1.unlocked.includes(k)),
  JSON.stringify(m1),
)

// --- dismiss the card, then test mute while the cursor is free --------------
await page.getByRole('button', { name: /Lanjutkan membangun/i }).click()
await page.waitForTimeout(400)
check('continue dismisses card', !(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))))
const muteBtn = page.locator('button[aria-label^="Suara"]')
check('sound on by default', (await muteBtn.getAttribute('aria-label')) === 'Suara: aktif')
await muteBtn.click()
await page.waitForTimeout(200)
check('mute persists', await page.evaluate(() => localStorage.getItem('cakrawala-audio-v1') === 'off'))
check('mute icon state', (await muteBtn.getAttribute('aria-label')) === 'Suara: mati')
await muteBtn.click()
await page.waitForTimeout(200)
check('unmute restores', await page.evaluate(() => localStorage.getItem('cakrawala-audio-v1') !== 'off'))

// --- foundation law: unsupported placement is rejected ----------------------
check('re-lock after celebrate', await ensureLocked())
await page.keyboard.press('1')
await aimAt(...faceF(2)) // front face of y1; its top is occupied → side cell floats
await place()
w = await world()
check('reject keeps world intact', w.length === 5, JSON.stringify(w))
check('reject aphorism', (await toastText()).includes('Tanpa fondasi'))
await page.screenshot({ path: 'shots/mq-03-reject.png' })

// --- cascade: break the foundation, everything above falls ------------------
await aimAt(...faceF(1)) // front face of y0
await breakBlock()
w = await world()
check('cascade collapses column', w.length === 0, JSON.stringify(w))
check('collapse aphorism', (await toastText()).includes('Fondasi runtuh'))
await page.screenshot({ path: 'shots/mq-04-collapse.png' })

// --- rebuild: beacon must not intercept the placement ray -------------------
await buildColumn()
w = await world()
check('rebuilt column', w.length === 5 && CANON.every(([_, kind], k) => hasBlock(w, 0, k, -8, kind)))
check('no second celebration', !(await page.evaluate(() => !!document.querySelector('[role="dialog"]'))))
await page.keyboard.press('1')
await aimAt(...faceF(5)) // through the beacon region onto the column top
await place()
w = await world()
check('beacon not raycastable', hasBlock(w, 0, 5, -8, 'server'), JSON.stringify(w))
await page.screenshot({ path: 'shots/mq-05-beacon.png' })

// --- renungan collection in the pause menu ----------------------------------
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
const renungan = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]')
  if (!dialog) return null
  const items = [...dialog.querySelectorAll('li')].map((li) => li.textContent)
  return { count: items.length, items }
})
check(
  'renungan collects all six',
  renungan !== null && renungan.count === 6 &&
    ['Fondasi pertama', 'Lapis demi lapis', 'Tanpa fondasi', 'Fondasi runtuh', 'Stack bermakna', 'Cakrawala']
      .every((t) => renungan.items.some((i) => i.includes(t))),
  JSON.stringify(renungan),
)
await page.screenshot({ path: 'shots/mq-06-renungan.png' })

// --- exit to the journey: the build stays in the shared world ---------------
await page.keyboard.press('Escape')
await page.waitForTimeout(1800)
const back = await page.evaluate(() => ({
  overflow: document.body.style.overflow,
  blocks: JSON.parse(localStorage.getItem('cakrawala-play-world-v1') ?? '[]').length,
}))
check('exit keeps shared world', back.overflow !== 'hidden' && back.blocks === 6, JSON.stringify(back))
await page.screenshot({ path: 'shots/mq-07-journey-beacon.png' })

// --- persistence across reload ----------------------------------------------
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(2200)
const m2 = await meta()
const w2 = await world()
check('reload persists meaning', m2.best === 6 && m2.done === true && w2.length === 6, JSON.stringify({ m2, n: w2.length }))

// --- 390px HUD ---------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 })
await page.waitForTimeout(800)
await clickNav('Tentang')
await page.waitForTimeout(3600)
await page.keyboard.press('ArrowDown')
await page.waitForTimeout(3000)
await page.getByRole('button', { name: /Play Character/i }).click()
await page.getByRole('button', { name: /Tetap masuk/i }).click()
await page.waitForTimeout(1600)
const phoneHud = await page.evaluate(() => {
  const doc = document.documentElement
  const rects = [...document.querySelectorAll('.pointer-events-auto')].map((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
  })
  const overflowX = doc.scrollWidth > window.innerWidth + 1
  const offscreen = rects.filter((r) => r.right > window.innerWidth + 1 || r.left < -1)
  return { overflowX, offscreen, width: window.innerWidth }
})
check('390px no overflow', !phoneHud.overflowX && phoneHud.offscreen.length === 0, JSON.stringify(phoneHud))
await page.screenshot({ path: 'shots/mq-08-phone-hud.png' })
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Menu'))
  btn?.click()
})
await page.waitForTimeout(500)
const phonePause = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]')
  if (!d) return { dialog: false }
  const r = d.getBoundingClientRect()
  return { dialog: true, fits: r.left >= 0 && r.right <= window.innerWidth && r.height <= window.innerHeight }
})
check('390px pause fits', phonePause.dialog && phonePause.fits, JSON.stringify(phonePause))
await page.screenshot({ path: 'shots/mq-09-phone-pause.png' })

console.log('console errors', errors)
if (errors.length) failures.push('console errors')
console.log(failures.length === 0 ? 'MEANING_QA_OK' : `MEANING_QA_FAILURES: ${failures.join(', ')}`)
await browser.close()
process.exit(failures.length === 0 ? 0 : 1)