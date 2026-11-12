// Responsive QA: screenshot the site at the 5 competition viewports.
// Usage: node scripts/shot.mjs [url]
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://localhost:5199/cakrawala-web-profile/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const VIEWPORTS = [
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'laptop-1440', width: 1440, height: 900 },
  { name: 'tv-1920', width: 1920, height: 1080 },
  { name: 'monitor-2560', width: 2560, height: 1440 },
  { name: '4k-3840', width: 3840, height: 2160 },
]

await mkdir('shots', { recursive: true })

const browser = await chromium.launch({ executablePath: EDGE, headless: true })

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  // station 1 (hero)
  await page.screenshot({ path: `shots/${vp.name}-01-hero.png` })

  // walk to the middle (Play Moment) and the end (Footer) via arrow keys
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `shots/${vp.name}-09-play.png` })

  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `shots/${vp.name}-11-footer.png` })

  await page.close()
  console.log(`done ${vp.name}`)
}

await browser.close()
