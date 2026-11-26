import { chromium } from 'playwright'

const BASE = process.env.QC_BASE || 'http://localhost:4173/'
const OUT = process.env.QC_OUT || '/tmp/shots'
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1500)

// Home -> mushaf list
await page.getByText('المصحف', { exact: true }).first().click()
await page.waitForTimeout(1200)
await shot(page, '01-surah-list')

// Open surah al-Baqarah (has gharib + asbab coverage)
await page.getByText('البقرة', { exact: true }).first().click()
await page.waitForTimeout(1500)
await shot(page, '02-reader')

// Surah info card
await page.getByRole('button', { name: 'معلومات عن السورة' }).click()
await page.waitForTimeout(900)
await shot(page, '03-surah-info')
await page.getByRole('button', { name: 'إغلاق معلومات السورة' }).click()
await page.waitForTimeout(400)

// Tap ayah 1 -> toolbar -> open unified card
await page.locator('[data-ayah="1"]').first().click()
await page.waitForTimeout(500)
await shot(page, '04-ayah-toolbar')
await page.getByRole('button', { name: 'تفسير الآية' }).click()
await page.waitForTimeout(1200)
await shot(page, '05-card-tafsir')

await page.getByRole('tab', { name: 'معاني الكلمات' }).click()
await page.waitForTimeout(900)
await shot(page, '06-card-gharib')

await page.getByRole('tab', { name: 'سبب النزول' }).click()
await page.waitForTimeout(900)
await shot(page, '07-card-asbab')

await page.getByRole('tab', { name: 'الحفظ بالتكرار' }).click()
await page.waitForTimeout(600)
await shot(page, '08-card-memorize-form')

// Offline preflight: the drill refuses to start with a clear message when the
// range audio is not stored on the device yet.
await page.context().setOffline(true)
await page.getByRole('button', { name: 'ابدأ التكرار' }).click()
await page.waitForTimeout(800)
await shot(page, '11-memorize-offline-blocked')
await page.context().setOffline(false)
await page.waitForTimeout(300)

// Start a drill: repeat ayah 1 three times with 1s gap, hide text on
await page.getByLabel('إخفاء نص الآية أثناء التكرار').check()
await page.getByRole('button', { name: 'ابدأ التكرار' }).click()
await page.waitForTimeout(2500)
await shot(page, '09-card-memorize-running')

// Close the card while the drill runs: mushaf shows the masked ayah
await page.getByRole('button', { name: 'إغلاق بطاقة الآية' }).click()
await page.waitForTimeout(800)
await shot(page, '10-reader-masked-ayah')

await browser.close()
console.log('done')
