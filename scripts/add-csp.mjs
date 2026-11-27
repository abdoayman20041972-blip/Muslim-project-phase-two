#!/usr/bin/env node
// Adds a Content-Security-Policy <meta> tag to the prerendered index.html that Capacitor ships.
// The prerendered page has a few inline <script> blocks whose content changes with every build, so their
// sha256 hashes are computed here from the final HTML instead of being hard-coded. Idempotent.
//   - script-src: own files plus those exact inline blocks (no 'unsafe-inline', no 'unsafe-eval').
//   - style-src keeps 'unsafe-inline': React inline style props and the prerendered <style> need it.
//   - connect-src / media-src allow https: because audio, radio, prayer-time and hadith hosts are many and
//     some HLS segment hosts are not known in advance. Plain http: and everything else stay blocked.
//   - object-src none, base-uri self, form-action none, frame-src none: the app uses none of them.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

export function inlineScriptHashes(html) {
  const hashes = []
  const re = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html))) {
    if (/\bsrc\s*=/.test(m[1])) continue
    if (!m[2].trim()) continue
    hashes.push(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`)
  }
  return [...new Set(hashes)]
}

export function buildPolicy(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob: https:",
    "connect-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-src 'none'",
  ].join('; ')
}

export function addCsp(html) {
  const policy = buildPolicy(inlineScriptHashes(html))
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`
  const without = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, '')
  const head = /<head\b[^>]*>/.exec(without)
  if (!head) throw new Error('<head> not found in index.html')
  // Keep the charset <meta> first: a WebView without a charset header only honours it within the first 1024 bytes.
  const charset = /<meta\s+charset=[^>]*>/i.exec(without)
  const at = charset && charset.index > head.index ? charset.index + charset[0].length : head.index + head[0].length
  return without.slice(0, at) + meta + without.slice(at)
}

// Byte offset (UTF-8) of the end of the charset <meta>, or -1 when absent.
export function charsetEndOffset(html) {
  const m = /<meta\s+charset=[^>]*>/i.exec(html)
  return m ? Buffer.byteLength(html.slice(0, m.index + m[0].length), 'utf8') : -1
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const file = process.argv[2] || '.output/public/index.html'
  const out = addCsp(readFileSync(file, 'utf8'))
  const end = charsetEndOffset(out)
  if (end < 0 || end > 1024) throw new Error(`charset <meta> must end within the first 1024 bytes (found at ${end})`)
  writeFileSync(file, out)
  console.log(`charset meta ends at byte ${end}`)
  console.log(`CSP added to ${file}`)
}
