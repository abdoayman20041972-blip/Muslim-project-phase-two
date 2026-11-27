import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(n) && !/\.test\./.test(n) ? [p] : []
  })
const files = walk(join(root, 'src'))
const css = readFileSync(join(root, 'src/styles.css'), 'utf8')

describe('fonts: Cairo for the UI, Amiri only for Quran verse text', () => {
  it('has no font-amiri class and no Georgia anywhere in source', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8')
      expect(t, f).not.toMatch(/font-amiri/)
      expect(t, f).not.toMatch(/Georgia/)
    }
  })

  it('names Amiri only in the font-face rules and the single .font-quran rule', () => {
    const rest = css
      .split('\n')
      .filter((l) => !l.startsWith('@font-face') && !l.startsWith('/*') && !l.startsWith('   starts'))
      .join('\n')
    const hits = rest.match(/[^{};]*Amiri[^{};]*/g) ?? []
    expect(hits.length).toBe(1)
    expect(rest).toMatch(/\.font-quran\{font-family:'Amiri',serif\}/)
    for (const f of files.filter((f) => !f.endsWith('styles.css'))) {
      const t = readFileSync(f, 'utf8')
      if (/Amiri/.test(t)) expect(f.endsWith('shareCard.ts')).toBe(true)
    }
  })

  it('applies .font-quran only to Quran verse text', () => {
    const users = files.filter((f) => /font-quran/.test(readFileSync(f, 'utf8'))).map((f) => f.replace(root + '/', ''))
    expect(users.sort()).toEqual([
      'src/app/features/home/DailyAyahCard.tsx',
      'src/app/features/prophets/ProphetsView.tsx',
      'src/app/features/prophets/StoryBody.tsx',
      'src/app/features/prophets/YusufStoryBody.tsx',
      'src/app/features/quran/QuranReaderView.tsx',
      'src/app/features/quran/center/AyahCenterCard.tsx',
      'src/app/features/quran/center/MemorizePanel.tsx',
      'src/styles.css',
    ])
  })

  it('bundles only the two Amiri files that verse text needs, and the Cairo files', () => {
    for (const f of ['amiri-400-arabic', 'amiri-700-arabic', 'cairo-400-arabic', 'cairo-700-arabic']) {
      expect(existsSync(join(root, 'public/fonts', f + '.woff2')), f).toBe(true)
    }
    expect(existsSync(join(root, 'public/fonts/amiri-400-latin.woff2'))).toBe(false)
    expect(existsSync(join(root, 'public/fonts/amiri-700-latin.woff2'))).toBe(false)
    expect(css).not.toMatch(/amiri-\d+-latin/)
  })

  it('sets Cairo on the document so dialogs outside the app viewport match', () => {
    expect(css).toMatch(/html,body\{font-family:Cairo,sans-serif;\}/)
  })
})
