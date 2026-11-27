import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', '..', 'src')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : n.endsWith('.tsx') && !/\.test\./.test(n) ? [p] : []
  })

// Opening tag of every <input>/<select>/<textarea>, balanced across nested braces.
function tags(src: string): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = []
  const re = /<(input|select|textarea)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let i = m.index
    let depth = 0
    for (; i < src.length; i++) {
      const c = src[i]
      if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0 && src[i - 1] !== '=') break
    }
    out.push({ tag: src.slice(m.index, i + 1), line: src.slice(0, m.index).split('\n').length })
  }
  return out
}

describe('every form control has an accessible name', () => {
  it('has aria-label, aria-labelledby or an id that a <label htmlFor> points to', () => {
    const bad: string[] = []
    for (const f of walk(root)) {
      const src = readFileSync(f, 'utf8')
      for (const { tag, line } of tags(src)) {
        if (/type="(hidden|file)"/.test(tag) || /className="sr-only"/.test(tag) && /aria-hidden/.test(tag)) continue
        if (/aria-label=|aria-labelledby=/.test(tag)) continue
        const id = tag.match(/\bid="([^"]+)"/)?.[1]
        if (id && src.includes(`htmlFor="${id}"`)) continue
        bad.push(`${f.replace(root + '/', '')}:${line}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('names the prayer manual coordinates and the new tasbih text', () => {
    const prayer = readFileSync(join(root, 'app/features/prayer/PrayerTimesView.tsx'), 'utf8')
    expect(prayer).toContain('aria-label="خط العرض"')
    expect(prayer).toContain('aria-label="خط الطول"')
    expect(readFileSync(join(root, 'app/features/settings/sections/TasbihSection.tsx'), 'utf8')).toContain('aria-label="نص الذكر الجديد"')
  })
})
