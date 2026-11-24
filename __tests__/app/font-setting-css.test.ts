import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// jsdom does not apply stylesheets, so DOM tests passed while real CSS overrode the
// font-size settings. These checks read the stylesheet itself.
const css = readFileSync('src/styles.css', 'utf8')
const rule = (selector: string) =>
  css.split('\n').filter((l) => l.startsWith(selector))

describe('font size settings reach the screen', () => {
  it('azkar list and journey card sizes follow --zikr-scale', () => {
    for (const sel of ['.azkar-list-cards article p.u-reading-text{', '.azkar-journey-card p.u-reading-text{']) {
      const lines = rule(sel)
      expect(lines.length).toBeGreaterThan(0)
      for (const l of lines) expect(l).toMatch(/font-size:calc\([\d.]+rem\*var\(--zikr-scale,1\)\)!important/)
    }
  })

  it('hadith text has a size rule for each setting value', () => {
    expect(css).toMatch(/\.hadith-text\[data-size=sm\]\{font-size:/)
    expect(css).toMatch(/\.hadith-text\[data-size=lg\]\{font-size:/)
    const sm = css.match(/\.hadith-text\[data-size=sm\]\{font-size:([\d.]+)rem/)!
    const lg = css.match(/\.hadith-text\[data-size=lg\]\{font-size:([\d.]+)rem/)!
    expect(Number(sm[1])).toBeLessThan(1.25)
    expect(Number(lg[1])).toBeGreaterThan(1.25)
  })
})
