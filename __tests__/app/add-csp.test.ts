import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { addCsp, buildPolicy, charsetEndOffset, inlineScriptHashes } from '../../scripts/add-csp.mjs'

const A = 'window.__a=1'
const B = '{"x":2}'
const html = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><script>${A}</script><script type="module" async src="/assets/x.js"></script></head><body><script data-tsr-stream-part="">${B}</script></body></html>`
const sha = (t: string) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`
const policyOf = (out: string) => /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(out)![1]
const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(name + ' '))!

describe('scripts/add-csp.mjs', () => {
  it('hashes exactly the inline scripts (not the external one)', () => {
    expect(inlineScriptHashes(html)).toEqual([sha(A), sha(B)])
  })

  it('puts the meta right after the charset meta with those hashes and a strict script-src', () => {
    const out = addCsp(html)
    expect(out).toMatch(/<head><meta charSet="utf-8"\/><meta http-equiv="Content-Security-Policy"/)
    expect(charsetEndOffset(out)).toBeLessThan(1024)
    const script = directive(policyOf(out), 'script-src')
    expect(script).toContain(sha(A))
    expect(script).toContain(sha(B))
    expect(script).not.toContain("'unsafe-inline'")
    expect(script).not.toContain("'unsafe-eval'")
  })

  it('falls back to right after <head> when there is no charset meta', () => {
    expect(addCsp('<html><head><title>x</title></head></html>')).toMatch(/<head><meta http-equiv="Content-Security-Policy"/)
  })

  it('does not break on a quoted > inside a script attribute', () => {
    const h = `<html><head><meta charset="utf-8"><script data-x="a>b">${A}</script></head></html>`
    expect(inlineScriptHashes(h)).toEqual([sha(A)])
  })

  it('is idempotent', () => {
    const once = addCsp(html)
    expect(addCsp(once)).toBe(once)
  })

  it('keeps what the app needs and closes what it does not use', () => {
    const p = buildPolicy([])
    expect(directive(p, 'default-src')).toBe("default-src 'self'")
    expect(directive(p, 'media-src')).toContain('blob:')
    expect(directive(p, 'media-src')).toContain('https:')
    expect(directive(p, 'worker-src')).toContain('blob:')
    expect(directive(p, 'connect-src')).toContain('https:')
    expect(p).not.toMatch(/\bhttp:/)
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'none'", "frame-src 'none'"]) expect(p).toContain(d)
  })
})
