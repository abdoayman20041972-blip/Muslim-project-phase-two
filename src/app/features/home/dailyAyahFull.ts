import { surahList } from '../../../quran-meta'
import { stripBismillahPrefix } from '../../constants'
import { loadSurah } from '../quran/loadSurah'
import type { DailyAyah } from '../../../daily-ayahs'

/** Surah number for a daily-ayah surah name (short name, no "سورة"), or null. */
export function surahNumberForDailyAyah(ayah: DailyAyah): number | null {
  return surahList.find((s) => s.shortName === ayah.surah)?.number ?? null
}

/** The complete verse text from the bundled Quran data, or null when unavailable. */
export async function fullTextForDailyAyah(ayah: DailyAyah): Promise<string | null> {
  const surah = surahNumberForDailyAyah(ayah)
  if (!surah) return null
  try {
    const list = await loadSurah(surah)
    const found = list.find((a) => a.numberInSurah === ayah.number)
    if (!found) return null
    return surah !== 1 && surah !== 9 && found.numberInSurah === 1 ? stripBismillahPrefix(found.text) : found.text
  } catch {
    return null
  }
}

export function dailyAyahReference(ayah: DailyAyah, toNumber: (n: number) => string): string {
  return `سورة ${ayah.surah} — آية ${toNumber(ayah.number)}`
}
