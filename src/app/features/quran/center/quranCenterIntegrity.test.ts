/**
 * Integrity gate over the actual bundled Quran-center datasets, mirroring
 * quranPageIntegrity.test.ts for the mushaf text: a corrupted or truncated
 * regeneration fails the test suite, not the user's reading.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { cleanBookHtml } from '../../../../../scripts/build-quran-center-data.mjs'

const DIR = path.resolve(import.meta.dirname, '../../../../../public/data/quran-center')
const readJson = (file: string) => JSON.parse(readFileSync(path.join(DIR, file), 'utf8'))
const htmlTag = /<\/?[a-zA-Z][^>]*>/

// The data pack is local-only religious content (gitignored, injected on the
// build machine). A plain clone has no pack, and these checks then skip.
const hasPack = existsSync(path.join(DIR, 'version.json'))
// Asbab ships only after the scholarly review passes.
const hasAsbab = hasPack && existsSync(path.join(DIR, 'asbab'))

describe('cleanBookHtml', () => {
  it('converts markup to plain text without touching the words', () => {
    const html = '<p>أخبرنا <span class="book-ayah text-primary">﴿بسم ٱلله﴾</span>.</p><p>سطر&nbsp;ثانٍ</p><br />ختام'
    const text = cleanBookHtml(html)
    expect(text).toContain('﴿بسم ٱلله﴾.')
    expect(text).toContain('سطر ثانٍ')
    expect(text).not.toMatch(htmlTag)
    expect(text.endsWith('ختام')).toBe(true)
  })
  it('decodes entities and collapses blank runs', () => {
    expect(cleanBookHtml('أ&amp;ب\n\n\n\n<p>ج</p>')).toBe('أ&ب\n\nج')
  })
  it('handles non-strings defensively', () => {
    expect(cleanBookHtml(null as unknown as string)).toBe('')
  })
})

describe.skipIf(!hasPack)('bundled Quran-center data', () => {
  it('pins the dump version and the verified file hashes', () => {
    const version = readJson('version.json')
    expect(version.dumpVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(version.source).toBe('https://quranpedia.net')
    for (const digest of Object.values(version.files)) expect(String(digest)).toMatch(/^[0-9a-f]{64}$/)
    expect(version.changesFeed).toContain('/api/v1/changes?since=')
  })

  it('ships attribution as the dataset licence requires', () => {
    const attribution = readFileSync(path.join(DIR, 'ATTRIBUTION.md'), 'utf8')
    expect(attribution).toContain('quranpedia.net')
    expect(attribution).toContain('إصدار النسخة')
  })

  it('holds exactly 114 typed surah information rows', () => {
    const info = readJson('surahs-info.json')
    expect(info).toHaveLength(114)
    info.forEach((row: { surah: number; type: string; introduction: string }, index: number) => {
      expect(row.surah).toBe(index + 1)
      expect(['مكية', 'مدنية']).toContain(row.type)
      expect(row.introduction.trim().length).toBeGreaterThan(0)
      expect(row.introduction).not.toMatch(htmlTag)
    })
    // Known anchors: al-Fatihah is Meccan and the 5th revealed; al-Baqarah Medinan.
    expect(info[0].type).toBe('مكية')
    expect(info[0].descentOrder).toBe(5)
    expect(info[1].type).toBe('مدنية')
  })

  it('keeps the heritage gharib coverage with well-formed, markup-free entries', () => {
    const files = readdirSync(path.join(DIR, 'gharib')).filter((f) => f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(100)
    let ayahCount = 0
    const heritageBooks = new Set<string>()
    for (const file of files) {
      const map = readJson(path.join('gharib', file))
      for (const entries of Object.values(map)) {
        ayahCount++
        for (const entry of entries as { book: string; author: string; words: { text: string; meaning: string }[] }[]) {
          heritageBooks.add(entry.book)
          expect(entry.words.length).toBeGreaterThan(0)
          for (const word of entry.words) {
            expect(word.text.trim().length).toBeGreaterThan(0)
            expect(word.meaning.trim().length).toBeGreaterThan(0)
            expect(word.meaning).not.toMatch(htmlTag)
          }
        }
      }
    }
    // Content-review correction batch v5 (2026-11-26): strict filtered subset.
    // RELEASE = the 12 heritage Tier A entries in verified-entries.json only
    // (reviewer master table 8a9aac93, sha256 d6de3cd5…: canonical placement +
    // book-context + gloss match). Everything else is held in the private
    // pending store (.cache/quran-center-pending/), not lost. Blanket gharib
    // unlock is expressly not authorized.
    expect(ayahCount).toBeGreaterThanOrEqual(12)
    // Only the two classical books - contemporary works never enter the repo.
    expect([...heritageBooks].sort()).toEqual(['التبيان في تفسير غريب القرآن', 'تذكرة الأريب في تفسير الغريب', 'غريب القرآن', 'مجاز القرآن', 'معاني القرآن وإعرابه'].sort())
  })

  it.skipIf(!hasAsbab)('ships only reviewed asbab narrations, markup-free, matching the frozen pins', () => {
    const pins = readJson('verified-asbab.json')
    expect(Array.isArray(pins.entries)).toBe(true)
    const files = readdirSync(path.join(DIR, 'asbab')).filter((f) => f.endsWith('.json'))
    let count = 0
    for (const file of files) {
      const map = readJson(path.join('asbab', file))
      for (const list of Object.values(map)) {
        for (const entry of list as Array<{ text: string; source: string; reference: string; grade: string }>) {
          count++
          expect(entry.text.trim().length).toBeGreaterThan(0)
          expect(entry.text).not.toMatch(htmlTag)
          expect(entry.source.trim().length).toBeGreaterThan(0)
          expect(entry.reference.trim().length).toBeGreaterThan(0)
          expect(entry.grade.trim().length).toBeGreaterThan(0)
        }
      }
    }
    expect(count).toBe(pins.entries.length)
  })

})

describe('repo hygiene', () => {
  it('keeps contemporary-work and personal content out of the repo tree', () => {
    // Only the heritage-only public pack (public/data/quran-center) is committed.
    // The modern/private pack and the personal essentials pack stay gitignored.
    const gitignore = readFileSync(path.resolve(DIR, '../../../.gitignore'), 'utf8')
    expect(gitignore).toContain('/public/data/quran-center-private/')
    expect(gitignore).toContain('/private/')
    expect(gitignore).not.toContain('\n/public/data/quran-center/\n')
  })
})
