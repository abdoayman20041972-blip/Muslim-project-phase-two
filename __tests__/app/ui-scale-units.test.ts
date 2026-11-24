import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\./.test(name) && !/\.gen\./.test(name)) out.push(p)
  }
  return out
}

describe('ui scale units', () => {
  it('has no pixel text sizes that ignore the interface size setting', () => {
    const bad: string[] = []
    for (const f of walk(join(process.cwd(), 'src'))) {
      const s = readFileSync(f, 'utf8')
      if (/text-\[[0-9.]+px\]/.test(s) || /font-size: ?[0-9.]+px/.test(s)) bad.push(f)
    }
    expect(bad).toEqual([])
  })
})
