import { writeFile } from 'node:fs/promises'

const SOURCE_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani'
const OUTPUT_PATH = 'src/app/features/quran/data/quran-pages.json'
const EXPECTED_PAGES = 604
const EXPECTED_AYAHS = 6236

const response = await fetch(SOURCE_URL)
if (!response.ok) {
  throw new Error(`Quran page-map request failed: HTTP ${response.status}`)
}

const payload = await response.json()
const ayahs = payload?.data?.surahs?.flatMap((surah) =>
  (surah.ayahs ?? []).map((ayah) => ({
    surahNumber: surah.number,
    numberInSurah: ayah.numberInSurah,
    number: ayah.number,
    page: ayah.page,
  })),
) ?? []

if (ayahs.length !== EXPECTED_AYAHS) {
  throw new Error(`Expected ${EXPECTED_AYAHS} ayahs, received ${ayahs.length}`)
}

const pages = Object.fromEntries(
  Array.from({ length: EXPECTED_PAGES }, (_, index) => [String(index + 1), []]),
)

const seenNumbers = new Set()

for (const ayah of ayahs) {
  if (!Number.isInteger(ayah.page) || ayah.page < 1 || ayah.page > EXPECTED_PAGES) {
    throw new Error(`Invalid page number for ayah ${ayah.number}: ${ayah.page}`)
  }
  if (seenNumbers.has(ayah.number)) {
    throw new Error(`Duplicate global ayah number: ${ayah.number}`)
  }
  seenNumbers.add(ayah.number)
  pages[String(ayah.page)].push({
    surahNumber: ayah.surahNumber,
    numberInSurah: ayah.numberInSurah,
    number: ayah.number,
  })
}

const pageNumbers = Object.keys(pages).map(Number)
if (pageNumbers.length !== EXPECTED_PAGES) {
  throw new Error(`Expected ${EXPECTED_PAGES} pages, received ${pageNumbers.length}`)
}

const emptyPages = pageNumbers.filter((page) => pages[String(page)].length === 0)
if (emptyPages.length > 0) {
  throw new Error(`Empty pages: ${emptyPages.join(', ')}`)
}

if (seenNumbers.size !== EXPECTED_AYAHS) {
  throw new Error(`Expected ${EXPECTED_AYAHS} unique ayahs, received ${seenNumbers.size}`)
}

for (let number = 1; number <= EXPECTED_AYAHS; number += 1) {
  if (!seenNumbers.has(number)) {
    throw new Error(`Missing global ayah number: ${number}`)
  }
}

for (const page of pageNumbers) {
  const entries = pages[String(page)]
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1].number >= entries[index].number) {
      throw new Error(`Page ${page} is not ordered by global ayah number`)
    }
  }
}

await writeFile(OUTPUT_PATH, JSON.stringify(pages), 'utf8')

const written = JSON.parse(await (await import('node:fs/promises')).readFile(OUTPUT_PATH, 'utf8'))
const writtenPages = Object.keys(written).map(Number)
const writtenAyahs = writtenPages.reduce((total, page) => total + written[String(page)].length, 0)
const writtenNumbers = writtenPages.flatMap((page) => written[String(page)].map((ayah) => ayah.number))
const writtenUnique = new Set(writtenNumbers)

if (
  writtenPages.length !== EXPECTED_PAGES ||
  writtenPages.some((page) => written[String(page)].length === 0) ||
  writtenAyahs !== EXPECTED_AYAHS ||
  writtenUnique.size !== EXPECTED_AYAHS ||
  writtenNumbers.some((number) => number < 1 || number > EXPECTED_AYAHS)
) {
  throw new Error('Output self-verification failed')
}

console.log(JSON.stringify({
  outputVerification: 'PASS',
  pages: EXPECTED_PAGES,
  totalAyahs: EXPECTED_AYAHS,
  duplicates: EXPECTED_AYAHS - writtenUnique.size,
  missing: EXPECTED_AYAHS - writtenUnique.size,
  output: OUTPUT_PATH,
}))
