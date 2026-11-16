import { chromium } from 'playwright-core'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5199/cakrawala-web-profile/'
const errors = []

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(URL, { waitUntil: 'load' })
await page.getByRole('button', { name: /Mulai Play Character/ }).click()
await page.waitForFunction(() => window.__gameDebug != null, null, { timeout: 30000 })
await page.waitForTimeout(2500)

const placeCam = (mode) =>
  page.evaluate((mode) => {
    const { player, camera } = window.__gameDebug
    const wx = 104 + player.x
    const wz = player.z
    const fx = Math.sin(player.facing)
    const fz = Math.cos(player.facing)
    let ex, ez
    if (mode === 'front') {
      ex = wx + fx * 1.7
      ez = wz + fz * 1.7
    } else if (mode === 'head') {
      ex = wx + fx * 0.62
      ez = wz + fz * 0.62
    } else if (mode === 'side') {
      ex = wx + fz * 1.7
      ez = wz - fx * 1.7
    } else {
      ex = wx
      ez = wz
    }
    if (mode === 'top') {
      camera.position.set(wx, 5, wz)
      camera.up.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
      camera.lookAt(wx, 0, wz)
    } else {
      camera.up.set(0, 1, 0)
      camera.position.set(ex, mode === 'head' ? 1.72 : 1.5, ez)
      camera.lookAt(wx, mode === 'head' ? 1.66 : 1.3, wz)
    }
    camera.updateMatrixWorld()
  }, mode)

await page.getByRole('button', { name: 'Menu', exact: true }).click() // pause freezes the sim so the camera stays put
await page.waitForTimeout(300)
await page.evaluate(() => { const el = [...document.querySelectorAll('div')].find((d) => typeof d.className === 'string' && d.className.includes('z-40')); el.style.visibility = 'hidden'; window.__hud = el })
await placeCam('front')
await page.waitForTimeout(200)
await page.screenshot({ path: 'shots/andrew-front.png' })
await placeCam('side')
await page.waitForTimeout(200)
await page.screenshot({ path: 'shots/andrew-side.png' })
await placeCam('head')
await page.waitForTimeout(200)
await page.screenshot({ path: 'shots/andrew-head.png' })

// walk forward, then look from behind: the back of the head must face us
await page.evaluate(() => { window.__hud.style.visibility = '' })
await page.getByRole('button', { name: 'Lanjutkan' }).click()
await page.waitForTimeout(200)
await page.keyboard.down('w')
await page.waitForTimeout(1200)
await page.keyboard.up('w')
await page.keyboard.press('Escape') // stage one: drop lock + pause
await page.waitForTimeout(300)
await page.evaluate(() => { window.__hud.style.visibility = 'hidden' })
await placeCam('top')
await page.waitForTimeout(200)
await page.screenshot({ path: 'shots/andrew-walk-top.png' })
console.log('desktop shots done, errors:', JSON.stringify(errors))
await browser.close()

const b2 = await chromium.launch({ executablePath: EDGE, headless: true })
const ctx = await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const mp = await ctx.newPage()
const merr = []
mp.on('console', (m) => m.type() === 'error' && merr.push(m.text()))
mp.on('pageerror', (e) => merr.push(String(e)))
await mp.goto(URL, { waitUntil: 'load' })
await mp.getByRole('button', { name: /Mulai Play Character/ }).tap()
await mp.waitForTimeout(3000)
await mp.screenshot({ path: 'shots/andrew-mobile.png' })
console.log('mobile shot done, errors:', JSON.stringify(merr))
await b2.close()