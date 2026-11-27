import { describe, expect, it } from 'vitest'
import { HISN_CATEGORIES, SLEEP_ADDITIONS, AFTER_PRAYER_ADDITIONS } from '../../src/azkar-hisn'

// Records the real state of the Hisn texts so the "cleaned" claim in azkar-hisn.ts stays honest.
const texts = HISN_CATEGORIES.flatMap((c) => c.items.map((i) => ({ id: i.id, text: i.text })))

describe('azkar-hisn.ts text state', () => {
  it('has no digits, latin letters, brackets, markup or stray whitespace left from the raw dataset', () => {
    expect(texts.length).toBeGreaterThanOrEqual(80)
    for (const { id, text } of texts) {
      expect(text, id).not.toMatch(/[0-9A-Za-z()\[\]{}<>]/)
      expect(text, id).not.toMatch(/ {2,}|^\s|\s$/)
    }
  })

  it('has no "*" separator left in HISN_CATEGORIES', () => {
    expect(texts.filter((t) => t.text.includes('*'))).toHaveLength(0)
  })

  it('still carries the dataset "*" separator only in the two *_ADDITIONS items (known leftover, not rewritten)', () => {
    const extra = [...SLEEP_ADDITIONS, ...AFTER_PRAYER_ADDITIONS].filter((i) => i.text.includes('*')).map((i) => i.id)
    expect(extra).toEqual(['sleep:item-9', 'after-prayer:item-12'])
  })
})
