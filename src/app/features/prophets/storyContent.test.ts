import { describe, expect, it } from 'vitest'
import quran from '../quran/data/quran-uthmani.json'
import { PROPHET_STORIES } from './prophetsData'
import { DETAILED_STORIES } from './storyContent'
import { storyAyahReference, storySurahs } from './StoryBody'

const q = quran as Record<string, Array<{ numberInSurah: number; text: string }>>

describe('detailed prophet stories', () => {
  for (const [id, content] of Object.entries(DETAILED_STORIES)) {
    describe(id, () => {
      it('has every verse range inside its surah, in order within a scene', () => {
        const all = [...(content.intro?.v ?? []), ...content.scenes.flatMap((s) => s.v)]
        expect(all.reduce((n, [, a, b]) => n + (b - a + 1), 0)).toBeGreaterThanOrEqual(4)
        for (const [s, a, b] of all) {
          expect(q[String(s)]).toBeTruthy()
          expect(a).toBeGreaterThanOrEqual(1)
          expect(b).toBeGreaterThanOrEqual(a)
          expect(b).toBeLessThanOrEqual(q[String(s)].length)
        }
      })
      it('keeps Quran marks out of the narrative and has no long dashes or draft wording', () => {
        const narrative = content.scenes.flatMap((s) => s.p.filter((p) => p.k === 'n').map((p) => p.t)).join(' ')
        expect(narrative).not.toMatch(/[﴿﴾]/)
        const all = JSON.stringify(content)
        expect(all).not.toMatch(/[\u2013\u2014]/)
        for (const bad of ['غير موثق', 'غير منسوب', 'نسبة لم', 'ذكاء اصطناعي', 'مسودة']) expect(all).not.toContain(bad)
      })
      it('cites a collection and number for every hadith', () => {
        const hs = [content.intro?.hd, ...content.scenes.map((s) => s.hd)].filter(Boolean) as Array<{ s: string }>
        for (const h of hs) expect(h.s).toMatch(/^رواه (البخاري|مسلم) \(/)
      })
      it('feeds the story card from the detailed scenes', () => {
        const story = PROPHET_STORIES.find((s) => s.id === id)!
        expect(story.scenes.map((s) => s.heading)).toEqual(content.scenes.map((s) => s.h))
        expect(story.scenes.every((s) => s.text.length > 80)).toBe(true)
        const surah = story.verse.ref
        expect(surah.length).toBeGreaterThan(3)
      })
      it('uses the mushaf wording for the card verse', () => {
        const story = PROPHET_STORIES.find((s) => s.id === id)!
        const all = Object.values(q).flat().map((a) => a.text)
        expect(all.some((t) => t.includes(story.verse.text))).toBe(true)
      })
    })
  }
  it('names surahs for references', () => {
    expect(storyAyahReference([11, 25, 27])).toBe('سورة هود، الآيات ٢٥ إلى ٢٧')
    expect(storySurahs(DETAILED_STORIES.nuh)).toContain(71)
  })
})
