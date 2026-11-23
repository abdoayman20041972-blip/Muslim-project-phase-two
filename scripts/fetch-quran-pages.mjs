import { readFile, writeFile, rename } from 'node:fs/promises'
import { assertQuranPageMap } from '../src/app/features/quran/quranPageIntegrity.ts'
import { surahList } from '../src/quran-meta.ts'

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

// Validate before replacing the bundled map. A failed fetch must not corrupt it.
assertQuranPageMap(pages, surahList)
const text = JSON.parse(await readFile('src/app/features/quran/data/quran-uthmani.json', 'utf8'))
for (const surah of payload.data.surahs) {
  const local = text[String(surah.number)]
  if (!local || local.length !== surah.ayahs.length || surah.ayahs.some((ayah, index) =>
    ayah.number !== local[index].number || ayah.numberInSurah !== local[index].numberInSurah || ayah.text !== local[index].text
  )) throw new Error(`Source does not match bundled Quran text for surah ${surah.number}`)
}
const temporaryPath = `${OUTPUT_PATH}.tmp`
await writeFile(temporaryPath, JSON.stringify(pages) + '\n', 'utf8')
assertQuranPageMap(JSON.parse(await readFile(temporaryPath, 'utf8')), surahList)
await rename(temporaryPath, OUTPUT_PATH)
const writtenUnique = seenNumbers

console.log(JSON.stringify({
  outputVerification: 'PASS',
  pages: EXPECTED_PAGES,
  totalAyahs: EXPECTED_AYAHS,
  duplicates: EXPECTED_AYAHS - writtenUnique.size,
  missing: EXPECTED_AYAHS - writtenUnique.size,
  output: OUTPUT_PATH,
}))
