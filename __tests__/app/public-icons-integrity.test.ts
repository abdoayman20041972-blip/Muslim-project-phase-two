import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const publicDir = resolve(__dirname, '../../public')

function isWellFormedXml(text: string): boolean {
  try {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    return doc.getElementsByTagName('parsererror').length === 0 && doc.documentElement?.nodeName === 'svg'
  } catch {
    return false
  }
}

describe('public icon assets', () => {
  it('detects malformed SVG markup (guards the parser used below)', () => {
    expect(isWellFormedXml('<svg xmlns="http://www.w3.org/2000/svg">\n  <rect width="1" height="1" fill="#000"/ \n  <g/>\n</svg>')).toBe(false)
    expect(isWellFormedXml('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')).toBe(true)
  })

  it('every public/*.svg is well-formed XML', () => {
    const svgs = readdirSync(publicDir).filter((f) => f.endsWith('.svg'))
    expect(svgs.length).toBeGreaterThan(0)
    for (const f of svgs) {
      expect(isWellFormedXml(readFileSync(resolve(publicDir, f), 'utf-8')), f).toBe(true)
    }
  })

  it('PWA/manifest icons are not shipped in the APK-only build', () => {
    // manifest.json, apple-touch-icon and the PWA icon set were removed as web
    // traces; only favicon.svg and home-sketch.svg are referenced by the code.
    const removed = [
      'manifest.json',
      'apple-touch-icon.png',
      'icon-192.png',
      'icon-512.png',
      'icon-maskable-192.png',
      'icon-maskable-512.png',
      'logo192.png',
      'logo512.png',
      'sw.js',
    ]
    for (const f of removed) {
      expect(existsSync(resolve(publicDir, f)), f).toBe(false)
    }
  })
})
