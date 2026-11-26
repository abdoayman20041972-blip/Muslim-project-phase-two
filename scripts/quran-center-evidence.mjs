import { chromium } from 'playwright'

const BASE = process.env.QC_BASE || 'http://localhost:4173/'
const OUT = '/tmp/shots'
const results = []
const record = (name, value) => { results.push({ name, value }); console.log('EVIDENCE:', name, '=', JSON.stringify(value)) }

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
const cdnResponses = []
page.on('response', (r) => {
  if (r.url().includes('cdn.islamic.network')) cdnResponses.push({ url: r.url().split('/').pop(), status: r.status(), fromSW: r.fromServiceWorker() })
})

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1200)

// Register the audio cache service worker as the panel would, up front.
const swRegistered = await page.evaluate(async () => {
  try {
    await navigator.serviceWorker.register('/quran-audio-sw.js')
    await navigator.serviceWorker.ready
    return true
  } catch (e) { return String(e) }
})
record('service-worker-registered', swRegistered)

// Reader -> ayah 1 -> memorize tab
await page.getByText('المصحف', { exact: true }).first().click()
await page.waitForTimeout(1000)
await page.getByText('البقرة', { exact: true }).first().click()
await page.waitForTimeout(1500)

// ARIA wiring evidence
const aria = await page.evaluate(() => {
  const tab = document.querySelector('[role="tab"]')
  const panel = document.querySelector('[role="tabpanel"]')
  return { tabCount: document.querySelectorAll('[role="tab"]').length, hasPanel: !!panel }
})
record('aria-tabs-present', aria)

// Header clipping evidence: every header control fully inside the viewport
const headerClip = await page.evaluate(() => {
  const header = document.querySelector('.quran-reader-header')
  if (!header) return 'no header'
  const bad = [...header.querySelectorAll('button')].filter((b) => {
    const r = b.getBoundingClientRect()
    return r.left < -0.5 || r.right > window.innerWidth + 0.5
  }).length
  return { buttons: header.querySelectorAll('button').length, clipped: bad, vw: window.innerWidth }
})
record('header-clipping', headerClip)

await page.locator('[data-ayah="1"]').first().click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'تفسير الآية' }).click()
await page.waitForTimeout(900)
await page.getByRole('tab', { name: 'الحفظ بالتكرار' }).click()
await page.waitForTimeout(500)

// ONLINE drill on ayah 1 (3 repeats) - the audit blocker case.
await page.getByRole('button', { name: 'ابدأ التكرار' }).click()
await page.waitForTimeout(6000)
const onlineState = await page.evaluate(() => {
  const progress = document.querySelector('[data-testid="memorize-progress"]')
  const err = document.querySelector('[data-testid="memorize-error"]')
  const audio = [...document.querySelectorAll('audio')].find((a) => a.src)
  return {
    progressVisible: !!progress,
    errorVisible: !!err,
    progressText: progress?.textContent?.slice(0, 90) ?? null,
    audioSrc: audio?.src ?? null,
    audioTime: audio ? Math.round(audio.currentTime * 10) / 10 : null,
    audioPaused: audio?.paused ?? null,
  }
})
record('online-drill', onlineState)
await page.screenshot({ path: `${OUT}/12-online-drill-playing.png` })

// What landed in the cache?
const cached1 = await page.evaluate(async () => {
  const keys = await (await caches.open('quran-ayah-audio-v1')).keys()
  return keys.map((k) => k.url.split('/').pop())
})
record('cache-after-online-play', cached1)

// OFFLINE replay of the same ayah: stop, cut network, start again.
await page.getByRole('button', { name: 'إنهاء التكرار' }).click()
await page.waitForTimeout(600)
await context.setOffline(true)
await page.getByRole('button', { name: 'ابدأ التكرار' }).click()
await page.waitForTimeout(5000)
const offlineState = await page.evaluate(() => {
  const progress = document.querySelector('[data-testid="memorize-progress"]')
  const err = document.querySelector('[data-testid="memorize-error"]')
  const audio = [...document.querySelectorAll('audio')].find((a) => a.src)
  return {
    progressVisible: !!progress,
    errorVisible: !!err,
    progressText: progress?.textContent?.slice(0, 90) ?? null,
    audioTime: audio ? Math.round(audio.currentTime * 10) / 10 : null,
    audioPaused: audio?.paused ?? null,
  }
})
record('offline-drill-cached-ayah', offlineState)
await page.screenshot({ path: `${OUT}/13-offline-drill-from-cache.png` })

// OFFLINE drill on an UNCACHED range must be blocked before playback.
await page.getByRole('button', { name: 'إنهاء التكرار' }).click()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'إغلاق بطاقة الآية' }).click()
await page.waitForTimeout(500)
await page.locator('[data-ayah="3"]').first().click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'تفسير الآية' }).click()
await page.waitForTimeout(700)
await page.getByRole('tab', { name: 'الحفظ بالتكرار' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: 'ابدأ التكرار' }).click()
await page.waitForTimeout(900)
const blocked = await page.evaluate(() => {
  const alert = document.querySelector('[role="alert"]')
  const progress = document.querySelector('[data-testid="memorize-progress"]')
  return { alertText: alert?.textContent?.slice(0, 120) ?? null, startedAnyway: !!progress }
})
record('offline-uncached-blocked', blocked)
await page.screenshot({ path: `${OUT}/14-offline-uncached-blocked.png` })

record('cdn-network-traffic', cdnResponses)
await browser.close()
console.log('SUMMARY:'); for (const r of results) console.log('-', r.name, JSON.stringify(r.value))
