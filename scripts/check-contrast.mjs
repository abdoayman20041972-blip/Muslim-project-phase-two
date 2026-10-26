// Verifies --azkar-teal-ink contrast against card/surface backgrounds in every mode/theme.
// Usage: node scripts/check-contrast.mjs   (exit code 1 if any pair is below 4.5:1)
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const THEMES = ['teal', 'blue', 'purple', 'rose', 'amber']

const rules = [...css.matchAll(/(?:^|\n)([^{}\n]+)\{([^}]*)\}/g)].map((m) => ({
  selectors: m[1].split(',').map((x) => x.trim()),
  body: m[2],
}))
const vars = (selectors) => {
  const out = {}
  for (const sel of selectors) {
    for (const r of rules) {
      if (!r.selectors.includes(sel)) continue
      for (const v of r.body.matchAll(/--(azkar-[\w-]+)\s*:\s*([^;]+);/g)) out[v[1]] = v[2].trim()
    }
  }
  return out
}
const parse = (v) => {
  const [h, s, l] = v.split('/')[0].trim().split(/\s+/).map((x) => parseFloat(x))
  return [h, s, l]
}
const toRgb = ([h, s, l]) => {
  s /= 100; l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}
const lum = (c) => {
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

let failed = false
for (const mode of ['light', 'dark']) {
  for (const theme of THEMES) {
    const sels = [':root']
    if (mode === 'dark') sels.push('.dark')
    if (theme !== 'teal') {
      sels.push(`html[data-theme="${theme}"]`)
      if (mode === 'dark') sels.push(`.dark[data-theme="${theme}"]`, `html.dark[data-theme="${theme}"]`)
    }
    const v = vars(sels)
    let ink = v['azkar-teal-ink']
    if (!ink || ink.startsWith('var(')) ink = v['azkar-teal-deep']
    const inkRgb = toRgb(parse(ink))
    const bgs = ['azkar-bg', 'azkar-bg-alt', 'azkar-card', 'azkar-surface-2']
    const results = bgs.map((k) => [k, ratio(inkRgb, toRgb(parse(v[k])))])
    const min = Math.min(...results.map((r) => r[1]))
    if (min < 4.5) failed = true
    console.log(`${mode.padEnd(5)} ${theme.padEnd(6)} min ${min.toFixed(2)}  ${min >= 4.5 ? 'OK' : 'FAIL'}`)
  }
}
process.exit(failed ? 1 : 0)
