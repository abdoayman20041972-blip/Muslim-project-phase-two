import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { loadSurah as loadSurahType } from '../../src/app/features/quran/loadSurah'

const ayahs = Array.from({ length: 21 }, (_, index) => ({
  number: index + 8,
  numberInSurah: index + 1,
  text: index === 0 ? 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ آية أولى' : 'نص الآية ' + (index + 1),
}))

let loadSurah: typeof loadSurahType

describe('loadSurah', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.doMock('../../src/app/features/quran/data/quran-uthmani.json', () => ({
      default: { '92': ayahs },
    }))
    ;({ loadSurah } = await import('../../src/app/features/quran/loadSurah'))
  })

  it('loads and maps a complete local surah without stripping bismillah', async () => {
    const result = await loadSurah(92)
    expect(result).toEqual(ayahs)
    expect(result[0].text).toContain('بِسْمِ')
  })

  it('returns a new cached array without loading the local data again after success', async () => {
    const first = await loadSurah(92)
    first[0] = { ...first[0], text: 'mutated consumer value' }

    const second = await loadSurah(92)

    expect(second).not.toBe(first)
    expect(second).toEqual(ayahs)
  })

  it('shares the same in-flight promise and local data load for duplicate requests', async () => {
    let resolveModule!: (module: { default: Record<string, typeof ayahs> }) => void
    const modulePromise = new Promise<{ default: Record<string, typeof ayahs> }>((resolve) => {
      resolveModule = resolve
    })
    vi.doMock('../../src/app/features/quran/data/quran-uthmani.json', () => modulePromise)

    vi.resetModules()
    ;({ loadSurah } = await import('../../src/app/features/quran/loadSurah'))

    const firstPromise = loadSurah(92)
    const secondPromise = loadSurah(92)

    resolveModule({ default: { '92': ayahs } })
    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first).toEqual(ayahs)
    expect(second).toBe(first)
  })

  it('does not cache an incomplete local surah and allows a later retry', async () => {
    vi.doMock('../../src/app/features/quran/data/quran-uthmani.json', () => ({
      default: { '92': ayahs.slice(0, 20) },
    }))
    vi.resetModules()
    ;({ loadSurah } = await import('../../src/app/features/quran/loadSurah'))

    await expect(loadSurah(92)).rejects.toThrow('incomplete')

    vi.doMock('../../src/app/features/quran/data/quran-uthmani.json', () => ({
      default: { '92': ayahs },
    }))
    vi.resetModules()
    ;({ loadSurah } = await import('../../src/app/features/quran/loadSurah'))

    await expect(loadSurah(92)).resolves.toEqual(ayahs)
  })

  it('throws incomplete for an empty local ayah list', async () => {
    vi.doMock('../../src/app/features/quran/data/quran-uthmani.json', () => ({
      default: { '92': [] },
    }))
    vi.resetModules()
    ;({ loadSurah } = await import('../../src/app/features/quran/loadSurah'))

    await expect(loadSurah(92)).rejects.toThrow('incomplete')
  })
})
