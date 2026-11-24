import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Captions below 11px (0.6875rem) were unreadable on phones. All screens, including
// Settings must not bring them back through Tailwind size classes.
function walk(dir: string, out: string[] = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') && !p.includes('.test.')) out.push(p)
  }
  return out
}

describe('minimum caption size on every screen including settings', () => {
  it('has no text-[<0.6875rem] classes', () => {
    const bad: string[] = []
    for (const file of walk(path.join(process.cwd(), 'src/app'))) {
      const m = fs.readFileSync(file, 'utf8').match(/text-\[0\.[0-5]\d*rem\]|text-\[0\.6[0-7]\d*rem\]|text-\[\d{1}px\]/g)
      if (m) bad.push(file + ': ' + [...new Set(m)].join(','))
    }
    expect(bad).toEqual([])
  })
})
