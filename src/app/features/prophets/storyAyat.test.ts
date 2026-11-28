import { describe, expect, it } from 'vitest'
import { EXPECTED_AYAT } from './expectedAyat'
import { DETAILED_STORIES } from './storyContent'

const expand = (spec: string) =>
  spec.split(' ').flatMap((part) => {
    const [surah, range] = part.split(':')
    const [from, to] = range.split('-').map(Number)
    return Array.from({ length: (to ?? from) - from + 1 }, (_, i) => `${surah}:${from + i}`)
  })

describe('exact ayat per story', () => {
  it('pins every detailed story', () => {
    expect(Object.keys(EXPECTED_AYAT).sort()).toEqual(Object.keys(DETAILED_STORIES).sort())
  })
  for (const [id, content] of Object.entries(DETAILED_STORIES)) {
    it(`${id} shows exactly the pinned ayat, each once, intro first`, () => {
      const shown = [...(content.intro?.v ?? []), ...content.scenes.flatMap((s) => s.v)].flatMap(([s, a, b]) =>
        Array.from({ length: b - a + 1 }, (_, i) => `${s}:${a + i}`),
      )
      expect(shown.slice().sort()).toEqual(expand(EXPECTED_AYAT[id]).sort())
      expect(new Set(shown).size).toBe(shown.length)
    })
  }
})
