// Extracts the 20-frame run loop bone matrices from the Sketchfab reference
// "Male Running (20 frames loop)" by Denys Almaral (Free Standard license).
// The official Viewer API's node visitor skips Bone nodes, so we read the real
// osgAnimation skeleton directly from the loaded scene graph in-page, while
// driving time with the API's seekTo. Output: temp JSON of per-frame bone
// local+world matrices, used offline to derive src/three/runLoop.ts.
// Research tool, not shipped UI. Usage: node scripts/sk-loop-extract.mjs
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const EMBED =
  'https://sketchfab.com/models/ed3d7a4b8b124e1591be83ccb4c02dcd/embed?autostart=1&internal=1&tracking=0&api_version=1.12.0&api_id=cakrawala1&api_log=1&ui_animations=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0'
const OUT = 'C:/Users/USER/AppData/Local/Temp/run-loop-matrices.json'
const ANIM_UID = 'd93cbbeb0f5941c4b6fac29fddcd20af'
const INSTANCE = 'cakrawala1'

const browser = await chromium.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-features=ThirdPartyCookieBlocking,TrackingProtection3pcd'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
page.on('console', (m) => {
  const t = m.text()
  if (/error|webgl|fail/i.test(t)) console.log('[console]', t.slice(0, 160))
})
await page.goto(EMBED, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.evaluate(() => {
  window.__msgs = []
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type) window.__msgs.push(e.data)
  })
  window.__send = (m) => window.postMessage(m, '*')
})
await page.waitForTimeout(12000)

// --- bootstrap the real osg scene graph + collect Bone nodes in-page
const setup = await page.evaluate(() => {
  window.webpackChunksketchfab.push([[Math.random()], {}, (r) => (window.__wr = r)])
  const wr = window.__wr
  const inst = wr('CUcO').Z.instance
  const roots = []
  for (const [k, v] of Object.entries(inst._maps)) {
    const n = v && (v.node || v.resource)
    if (n && n.getChildren) roots.push(n)
  }
  const seen = new Set()
  const bones = []
  const walk = (n, d) => {
    if (!n || seen.has(n) || d > 60) return
    seen.add(n)
    const cn = n.className ? n.className() : ''
    const nm = n.getName ? n.getName() : ''
    if (/Bone/i.test(cn) || /pelvis|spine|thigh|calf|foot|upperarm|forearm|hand|head|neck|clavicle|toe|hips|chest|root/i.test(nm)) {
      if (n.getMatrix) bones.push({ name: nm, cn, node: n })
    }
    for (const c of n.getChildren ? n.getChildren() : []) walk(c, d + 1)
  }
  for (const r of roots) walk(r, 0)
  window.__bones = bones
  return { roots: roots.length, seen: seen.size, bones: bones.map((b) => b.cn + ':' + b.name) }
})
console.log('setup', JSON.stringify(setup))
if (!setup.bones.length) {
  await page.screenshot({ path: 'C:/Users/USER/AppData/Local/Temp/sk-extract-diag.png' })
  throw new Error('no bones in scene graph')
}

// --- API handshake for seekTo
await page.evaluate((inst) => window.__send({ type: 'api.initialize', name: '1.12.0', instanceId: inst, requestId: 999 }), INSTANCE)
await page.waitForFunction(() => window.__msgs.some((m) => m.type === 'api.initialize.result'), null, { timeout: 15000, polling: 100 })
let id = 0
const request = async (member, args = []) => {
  const requestId = ++id
  await page.evaluate(
    ([m, a, r, inst]) => window.__send({ type: 'api.request', instanceId: inst, member: m, arguments: a, requestId: r }),
    [member, args, requestId, INSTANCE],
  )
  await page.waitForFunction((r) => window.__msgs.some((m) => m.type === 'api.request.result' && m.requestId === r), requestId, { timeout: 15000, polling: 50 })
  return page.evaluate((r) => window.__msgs.find((x) => x.type === 'api.request.result' && x.requestId === r).results, requestId)
}
const anims = await request('getAnimations')
const duration = (anims[1] || anims[0])[0][2]
console.log('duration', duration)
await request('setCurrentAnimationByUID', [ANIM_UID])
await request('pause')

const readPose = () =>
  page.evaluate(() => {
    const out = {}
    for (const b of window.__bones) {
      const local = Array.from(b.node.getMatrix())
      const wm = b.node.getWorldMatrices ? b.node.getWorldMatrices() : null
      out[b.name] = { local, world: wm && wm[0] ? Array.from(wm[0]) : null }
    }
    return out
  })

const frames = []
for (let f = 0; f < 20; f++) {
  const t = (f / 20) * duration
  await request('seekTo', [t])
  await page.waitForTimeout(240)
  const timeRes = await request('getCurrentTime')
  const pose = await readPose()
  frames.push({ f, t, time: timeRes && (timeRes[1] ?? timeRes[0]), pose })
  console.log('frame', f, 'time', JSON.stringify(timeRes).slice(0, 60))
}
writeFileSync(OUT, JSON.stringify({ duration, bones: setup.bones, frames }))
console.log('wrote', OUT)
await browser.close()