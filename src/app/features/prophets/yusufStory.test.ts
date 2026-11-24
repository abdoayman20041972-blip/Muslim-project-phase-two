import { describe, expect, it } from 'vitest'
import quran from '../quran/data/quran-uthmani.json'
import { PROPHET_STORIES } from './prophetsData'
import { ayahDisplayText } from './YusufStoryBody'
import { YUSUF_INTRO_VERSES, YUSUF_SCENES } from './yusufStory'

const surah = (quran as Record<string, Array<{ numberInSurah: number; text: string }>>)['12']

describe('Yusuf story content', () => {
  it('shows every ayah of Surat Yusuf exactly once, in order', () => {
    const ranges = [YUSUF_INTRO_VERSES, ...YUSUF_SCENES.flatMap((s) => s.v)]
    const shown: number[] = []
    for (const [from, to] of ranges) for (let n = from; n <= to; n++) shown.push(n)
    expect(shown).toEqual(Array.from({ length: surah.length }, (_, i) => i + 1))
    expect(surah).toHaveLength(111)
  })

  it('keeps Quran wording out of the narrative: ayah text only comes from the mushaf', () => {
    const narrative = YUSUF_SCENES.flatMap((s) => s.p.map((p) => p.t)).join(' ')
    expect(narrative).not.toMatch(/[﴿﴾]/)
    expect(narrative).not.toMatch(/[\u064B-\u0652]{3,}/)
  })

  it('has no long dashes that interrupt sentences', () => {
    const all = JSON.stringify(YUSUF_SCENES)
    expect(all).not.toMatch(/[\u2013\u2014]/)
  })

  it('has no draft or review wording in reader text', () => {
    const all = JSON.stringify(YUSUF_SCENES)
    for (const bad of ['لم يُعاد', 'غير موثق', 'غير منسوب', 'نسبة لم', 'ذكاء اصطناعي', 'مسودة']) {
      expect(all).not.toContain(bad)
    }
  })

  it('cites a collection and number for every hadith', () => {
    for (const scene of YUSUF_SCENES) {
      if (scene.hd) expect(scene.hd.s).toMatch(/^رواه (البخاري|مسلم) \(/)
    }
  })

  it('strips the basmala from ayah 1 only', () => {
    expect(ayahDisplayText(1, surah[0].text).startsWith('الٓر')).toBe(true)
    expect(ayahDisplayText(2, surah[1].text)).toBe(surah[1].text)
  })

  it('uses the app mushaf wording for the closing ayah on the story card', () => {
    const story = PROPHET_STORIES.find((s) => s.id === 'yusuf')!
    expect(surah[89].text).toContain(story.verse.text)
    expect(story.scenes.length).toBe(YUSUF_SCENES.length)
    expect(story.scenes.every((s) => s.text.length > 40)).toBe(true)
  })
})
