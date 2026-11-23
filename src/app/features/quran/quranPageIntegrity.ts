import QURAN_PAGE_STARTS from './data/quran-page-starts.json' with { type: 'json' }

export type QuranPageEntry = { surahNumber: number; numberInSurah: number; number: number }
export type QuranPageMap = Record<string, QuranPageEntry[]>
export type SurahShape = { number: number; numberOfAyahs: number }
export type PageGroup = { startIndex: number; endIndex: number; realPageNumber: number }

/** Validate the complete ordered 604-page reference map, not the Quran text. */
export function assertQuranPageMap(value: unknown, surahs: readonly SurahShape[]): asserts value is QuranPageMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Quran page map')
  const map = value as Record<string, unknown>
  const keys = Object.keys(map)
  if (keys.length !== 604 || keys.some(key => !/^[1-9]\d*$/.test(key) || Number(key) > 604)) {
    throw new Error('Expected exactly pages 1 through 604')
  }
  if (surahs.length !== 114 || surahs.reduce((sum, surah) => sum + surah.numberOfAyahs, 0) !== 6236) {
    throw new Error('Invalid surah metadata')
  }
  const expected = surahs.flatMap(surah => Array.from({ length: surah.numberOfAyahs }, (_, index) => ({
    surahNumber: surah.number, numberInSurah: index + 1,
  })))
  let index = 0
  for (let page = 1; page <= 604; page++) {
    const entries = map[String(page)]
    if (!Array.isArray(entries) || !entries.length) throw new Error(`Missing or empty Quran page ${page}`)
    const [surah, ayah] = QURAN_PAGE_STARTS[page - 1]
    if (entries[0]?.surahNumber !== surah || entries[0]?.numberInSurah !== ayah) {
      throw new Error(`Incorrect Medina Mushaf boundary on page ${page}`)
    }
    for (const entry of entries) {
      const target = expected[index]
      if (!target || !entry || typeof entry !== 'object' ||
          entry.number !== index + 1 || entry.surahNumber !== target.surahNumber ||
          entry.numberInSurah !== target.numberInSurah) {
        throw new Error(`Invalid or out-of-order Quran reference on page ${page}, position ${index + 1}`)
      }
      index++
    }
  }
  if (index !== 6236) throw new Error(`Expected 6236 Quran references, received ${index}`)
  const pages = value as QuranPageMap
  if (pages['1'].length !== 7 || pages['1'].some(entry => entry.surahNumber !== 1) ||
      pages['2'][0].surahNumber !== 2 || pages['2'][0].numberInSurah !== 1) {
    throw new Error('Invalid opening Quran page boundaries')
  }
}

/** Require every loaded ayah to have a reference in its own surah before grouping. */
export function groupSurahPages(
  ayahs: readonly { number: number; numberInSurah: number }[], surahNumber: number, map: QuranPageMap,
): PageGroup[] {
  if (!ayahs.length) return []
  const locations = new Map<number, { page: number; entry: QuranPageEntry }>()
  for (const [page, entries] of Object.entries(map)) {
    for (const entry of entries) if (entry.surahNumber === surahNumber) locations.set(entry.number, { page: Number(page), entry })
  }
  const groups: PageGroup[] = []
  for (let index = 0; index < ayahs.length; index++) {
    const ayah = ayahs[index]
    const match = locations.get(ayah.number)
    if (!match || match.entry.numberInSurah !== ayah.numberInSurah) return []
    const last = groups.at(-1)
    if (last?.realPageNumber === match.page) last.endIndex = index
    else groups.push({ startIndex: index, endIndex: index, realPageNumber: match.page })
  }
  return groups
}
