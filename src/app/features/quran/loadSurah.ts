import { surahList } from '../../../quran-meta'
import type { Ayah } from '../../constants'

type QuranData = Record<
  string,
  Array<{ number: number; numberInSurah: number; text: string }>
>

const surahCache = new Map<number, Ayah[]>()
const inFlightSurahs = new Map<number, Promise<Ayah[]>>()

export async function loadSurah(surahNumber: number, signal?: AbortSignal): Promise<Ayah[]> {
  void signal

  const cached = surahCache.get(surahNumber)
  if (cached) return [...cached]

  const inFlight = inFlightSurahs.get(surahNumber)
  if (inFlight) return inFlight

  const request = (async () => {
    try {
      const module = (await import('./data/quran-uthmani.json')) as { default: QuranData }
      const list = (module.default[String(surahNumber)] ?? []).map((ayah) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
      }))
      const expected = surahList.find((surah) => surah.number === surahNumber)?.numberOfAyahs
      if (!expected || !list.length || list.length !== expected) throw new Error('incomplete')
      surahCache.set(surahNumber, [...list])
      return list
    } finally {
      inFlightSurahs.delete(surahNumber)
    }
  })()

  inFlightSurahs.set(surahNumber, request)
  return request
}

// Test-only: clears module-level cache/in-flight state between isolated test cases.
export function __resetSurahCacheForTests(): void {
  surahCache.clear()
  inFlightSurahs.clear()
}
