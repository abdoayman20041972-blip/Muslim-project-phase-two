import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function walk(dir: string, out: string[] = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') && !p.includes('.test.')) out.push(p)
  }
  return out
}
const files = walk(path.join(process.cwd(), 'src/app'))
const count = (re: RegExp) => files.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(re)?.length ?? 0), 0)

describe('11px text is kept for tiny captions only', () => {
  it('buttons and body-like labels moved up to 13px', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const cl = m[1] ?? m[2] ?? ''
        if (!cl.includes('text-[0.6875rem]')) continue
        const buttonLike = /rounded-xl/.test(cl) && /px-3/.test(cl) && /py-2/.test(cl) && /font-bold/.test(cl)
        const bodyLike = /text-azkar-ink-soft|text-azkar-muted|text-red-/.test(cl) && !/opacity|ink-faint|py-0\.5/.test(cl)
        if ((buttonLike || bodyLike) && !/dashboard-nav-item|AyahCenterCard/.test(f + cl)) bad.push(path.basename(f) + ': ' + cl.slice(0, 80))
      }
    }
    expect(bad).toEqual([])
  })

  it('uses 13px where it was raised, and the 11px count dropped from 188', () => {
    expect(count(/text-\[0\.6875rem\]/g)).toBeLessThanOrEqual(90)
    expect(count(/text-\[0\.8125rem\]/g)).toBeGreaterThanOrEqual(104)
  })
})
