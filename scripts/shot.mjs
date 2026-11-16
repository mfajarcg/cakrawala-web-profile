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

  // in-page links go through the journey controller, same as a real visitor
  const click = (label) =>
    page.evaluate((label) => {
      const btn = [...document.querySelectorAll('header button')].find(
        (b) => b.textContent.trim() === label,
      )
      btn?.click()
    }, label)

  // station 3 (Services) to check the wide three-column panel
  await click('Layanan')
  await page.waitForTimeout(3600)
  await page.screenshot({ path: `shots/${vp.name}-03-services.png` })

  // Tentang lands on About, one arrow step further is Play Character
  await click('Tentang')
  await page.waitForTimeout(3600)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `shots/${vp.name}-09-play.png` })

  await click('Kontak')
  await page.waitForTimeout(3600)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `shots/${vp.name}-11-footer.png` })

  // full-screen tribute overlay opened from the footer plate
  await page.click('[data-tribute-open]')
  await page.waitForTimeout(900)
  await page.screenshot({ path: `shots/${vp.name}-12-tribute.png` })

  await page.close()
  console.log(`done ${vp.name}`)
}

await browser.close()
