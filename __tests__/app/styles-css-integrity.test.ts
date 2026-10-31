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

  it('keeps the dark tasbih counter card fully transparent (the night photo is the surface)', () => {
    // Regression guard: the dark variant used to paint a solid gradient with
    // higher selector specificity than the transparent redesign rule, so dark
    // mode showed a solid card over the night background — users reported it
    // as «الكارد الذي يحجب الخلفية».
    const darkCard = /\.dark \.tasbih-counter-card\{[^}]*\}/.exec(css)
    expect(darkCard).not.toBeNull()
    expect(darkCard![0]).toContain('background:transparent')
    expect(darkCard![0]).not.toMatch(/linear-gradient|radial-gradient|hsl\(/)
    // And the stats over the night photo must be light, not the light-mode
    // black-on-bright-photo treatment.
    const darkMeta = /\.dark \.tasbih-session-meta\{[^}]*\}/.exec(css)
    expect(darkMeta).not.toBeNull()
    expect(darkMeta![0]).not.toContain('#000')
  })
})
