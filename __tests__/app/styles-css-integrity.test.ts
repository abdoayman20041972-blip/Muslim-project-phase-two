import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../src/styles.css'), 'utf-8')

// Remove quoted strings so legitimate escapes such as content:"\n" are ignored.
const withoutStrings = css.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')

describe('styles.css integrity', () => {
  it('has no literal backslash-n outside strings (it silently corrupts selectors, e.g. nhtml/nbody)', () => {
    expect(withoutStrings).not.toMatch(/\\n/)
  })

  it('keeps html and body as real selectors', () => {
    expect(css).toMatch(/(^|\n)html\{[^}]*min-height:100%/)
    expect(css).toMatch(/(^|\n)body\{[^}]*min-height:100dvh/)
  })
})
