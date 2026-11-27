import { describe, expect, it } from 'vitest'
import { HISN_CATEGORIES } from '../../src/azkar-hisn'

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

  it('still carries the dataset "*" verse separator in exactly two items (11 separators) (known leftover, not rewritten)', () => {
    expect(texts.filter((t) => t.text.includes('*'))).toHaveLength(2)
    expect(texts.map((t) => t.text).join('').split('*').length - 1).toBe(11)
  })
})
