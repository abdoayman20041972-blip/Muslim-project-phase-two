import { describe, expect, it } from 'vitest'
import { PROPHET_ORDER, PROPHET_STORIES } from './prophetsData'
import { DETAILED_STORIES } from './storyContent'
import { YUSUF_SCENES } from './yusufStory'

const ayat = (v: Array<[number, number, number]>) => v.flatMap(([s, a, b]) => Array.from({ length: b - a + 1 }, (_, i) => `${s}:${a + i}`))

describe('prophet list order and content', () => {
  it('lists the ids in one explicit chronological order, each once', () => {
    expect(PROPHET_STORIES.map((s) => s.id)).toEqual([...PROPHET_ORDER])
    expect(new Set(PROPHET_ORDER).size).toBe(25)
    expect(PROPHET_ORDER[0]).toBe('adam')
    expect(PROPHET_ORDER[PROPHET_ORDER.length - 1]).toBe('muhammad')
    expect(PROPHET_ORDER.indexOf('nuh')).toBeLessThan(PROPHET_ORDER.indexOf('ibrahim'))
    expect(PROPHET_ORDER.indexOf('ibrahim')).toBeLessThan(PROPHET_ORDER.indexOf('musa'))
    expect(PROPHET_ORDER.indexOf('dawud')).toBeLessThan(PROPHET_ORDER.indexOf('isa'))
  })
  it('has a detailed story for every id except Yusuf (which has its own)', () => {
    for (const s of PROPHET_STORIES) {
      if (s.id === 'yusuf') expect(YUSUF_SCENES.length).toBeGreaterThan(0)
      else expect(DETAILED_STORIES[s.id], s.id).toBeTruthy()
    }
  })
  it('shows each ayah once per story', () => {
    for (const [id, c] of Object.entries(DETAILED_STORIES)) {
      const all = ayat([...(c.intro?.v ?? []), ...c.scenes.flatMap((s) => s.v)])
      expect(all.length - new Set(all).size, id).toBe(0)
    }
    const y = ayat(YUSUF_SCENES.flatMap((s) => s.v.map(([a, b]) => [12, a, b] as [number, number, number])))
    expect(y.length - new Set(y).size).toBe(0)
  })
})
