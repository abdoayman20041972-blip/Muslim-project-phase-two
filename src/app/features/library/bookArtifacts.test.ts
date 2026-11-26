import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const load = (f: string) => JSON.parse(readFileSync(`public/books/${f}`, 'utf8')) as { chapters: { t: string; p: string[] }[] }

describe('book data has no wiki markup leftovers', () => {
  for (const f of ['siyar-nubala.json', 'bidaya-prophets.json']) {
    it(`${f}: no templates, category/interwiki lines, BOM or Latin letters inside Arabic words`, () => {
      const book = load(f)
      for (const c of book.chapters) for (const p of c.p) {
        expect(p).not.toMatch(/\{\{|\}\}/)
        expect(p).not.toMatch(/^\s*تصنيف:/)
        expect(p).not.toMatch(/poetsgate\.com/)
        expect(p).not.toMatch(/\uFEFF/)
        expect(p.trim().length).toBeGreaterThan(0)
        expect(p).not.toMatch(/[\u0600-\u06FF][A-Za-z][\u0600-\u06FF]/)
      }
    })
  }
  it('chapter totals are intact', () => {
    expect(load('siyar-nubala.json').chapters.length).toBe(1648)
    expect(load('bidaya-prophets.json').chapters.length).toBe(154)
  })
})
