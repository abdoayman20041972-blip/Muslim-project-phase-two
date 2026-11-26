/**
 * Tamper tests for the Quran-center validator's frozen reviewed bytes.
 *
 * Audit gap closed in v3.4: previously an attacker could mutate a meaning,
 * REGENERATE files-manifest.json over the mutated tree, and pass validation.
 * verified-entries.json now pins sha256 of the exact reviewed word/meaning
 * bytes per Tier A entry, and the validator compares both against those
 * frozen hashes. These tests replicate the attack and require it to fail.
 */
import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const dataRoot = path.join(repoRoot, 'public', 'data')
const packInstalled = existsSync(path.join(dataRoot, 'quran-center', 'version.json'))

const sha256File = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex')

// Replicates the build script's manifest pinning so a test can regenerate the
// manifest AFTER mutating content, exactly like the attack the auditor flagged.
function regenerateManifest(root: string) {
  const files: Record<string, string> = {}
  for (const pack of ['quran-center', 'quran-center-private'].filter((p) => existsSync(path.join(dataRoot, p)))) {
    const base = path.join(root, pack)
    if (!existsSync(base)) continue
    const walk = (sub: string) => {
      for (const entry of readdirSync(path.join(base, sub))) {
        const rel = sub ? `${sub}/${entry}` : entry
        const full = path.join(base, rel)
        if (statSync(full).isDirectory()) walk(rel)
        else if (entry !== 'files-manifest.json') files[`${pack}/${rel}`] = sha256File(full)
      }
    }
    walk('')
  }
  writeFileSync(
    path.join(root, 'quran-center', 'files-manifest.json'),
    JSON.stringify({ generated: 'tamper-test', files }, null, 1),
  )
}

function freshCopy(): string {
  const tmp = mkdtempSync(path.join(tmpdir(), 'qc-tamper-'))
  for (const pack of ['quran-center', 'quran-center-private'].filter((p) => existsSync(path.join(dataRoot, p)))) {
    cpSync(path.join(dataRoot, pack), path.join(tmp, pack), { recursive: true })
  }
  return tmp
}

function runValidator(root: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync('node', [path.join(repoRoot, 'scripts', 'validate-quran-center.mjs')], {
      env: { ...process.env, QC_DATA_ROOT: root },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, output: out }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

describe.skipIf(!packInstalled)('quran-center validator frozen reviewed bytes', () => {
  it('passes on the untouched pack', () => {
    const tmp = freshCopy()
    try {
      const result = runValidator(tmp)
      expect(result.ok, result.output).toBe(true)
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('fails when a meaning is wholly replaced and files-manifest.json is regenerated over it', () => {
    const tmp = freshCopy()
    try {
      const file = path.join(tmp, 'quran-center', 'gharib', '2.json')
      const map = JSON.parse(readFileSync(file, 'utf8'))
      const firstAyah = Object.keys(map)[0]
      map[firstAyah][0].words[0].meaning = 'معنى مزيف بالكامل لا يشبه الأصل'
      writeFileSync(file, JSON.stringify(map, null, 1))
      regenerateManifest(tmp) // the attack: launder the mutation through a fresh manifest
      const result = runValidator(tmp)
      expect(result.ok).toBe(false)
      expect(result.output).toContain('meaning bytes differ from the reviewed bytes')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('fails when an asbab narration text is mutated and files-manifest.json is regenerated over it', () => {
    const tmp = freshCopy()
    try {
      const file = path.join(tmp, 'quran-center', 'asbab', '2.json')
      if (!existsSync(file)) return // asbab pack not installed in this tree
      const map = JSON.parse(readFileSync(file, 'utf8'))
      const firstAyah = Object.keys(map)[0]
      map[firstAyah][0].text += ' زيادة مزيفة'
      writeFileSync(file, JSON.stringify(map, null, 1))
      regenerateManifest(tmp)
      const result = runValidator(tmp)
      expect(result.ok).toBe(false)
      expect(result.output).toContain('text bytes differ from the reviewed bytes pinned in verified-asbab.json')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('fails when an unpinned asbab narration is added and files-manifest.json is regenerated', () => {
    const tmp = freshCopy()
    try {
      const file = path.join(tmp, 'quran-center', 'asbab', '2.json')
      if (!existsSync(file)) return
      const map = JSON.parse(readFileSync(file, 'utf8'))
      map['999'] = [{ text: 'رواية غير محققة', source: 'x', reference: 'x', grade: 'x' }]
      writeFileSync(file, JSON.stringify(map, null, 1))
      regenerateManifest(tmp)
      const result = runValidator(tmp)
      expect(result.ok).toBe(false)
      expect(result.output).toContain('without a frozen pin in verified-asbab.json')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  it('fails when only word diacritics are mutated (normalization-invisible change)', () => {
    const tmp = freshCopy()
    try {
      const file = path.join(tmp, 'quran-center', 'gharib', '2.json')
      const map = JSON.parse(readFileSync(file, 'utf8'))
      const firstAyah = Object.keys(map)[0]
      // Adding a fatha keeps the normalized provenance key identical; only the
      // frozen byte hash can catch it.
      map[firstAyah][0].words[0].text += 'َ'
      writeFileSync(file, JSON.stringify(map, null, 1))
      regenerateManifest(tmp)
      const result = runValidator(tmp)
      expect(result.ok).toBe(false)
      expect(result.output).toContain('word bytes differ from the reviewed bytes')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
