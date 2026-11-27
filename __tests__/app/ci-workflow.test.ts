import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const yml = readFileSync(resolve(__dirname, '../../.github/workflows/build-apk.yml'), 'utf8')
const step = (name: string) => {
  const i = yml.indexOf(`- name: ${name}`)
  expect(i, name).toBeGreaterThan(-1)
  const next = yml.indexOf('\n      - name:', i + 1)
  return yml.slice(i, next < 0 ? undefined : next)
}

describe('build-apk.yml hardening (static checks; the workflow itself runs only on GitHub)', () => {
  it('stays manually triggered and keeps the typecheck and test gates', () => {
    expect(yml).toMatch(/on:\n  workflow_dispatch:/)
    expect(step('Typecheck (blocking)')).toContain('exit $CODE')
    expect(step('Tests (blocking)')).toContain('exit $CODE')
  })

  it('has read-only top-level permissions', () => {
    expect(yml).toMatch(/\npermissions:\n  contents: read\n/)
  })

  it('pins every action to a 40-hex commit SHA with its tag in a comment', () => {
    const uses = yml.split('\n').filter((l) => /^\s*uses:/.test(l))
    expect(uses.length).toBeGreaterThanOrEqual(5)
    for (const l of uses) expect(l, l).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/)
  })

  it('fails the build when any signing secret is missing and never falls back to a debug APK', () => {
    const s = step('Prepare signing secrets')
    for (const n of ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
      expect(s).toContain(`[ -n "$${n}" ] || MISSING=`)
    }
    expect(s).toMatch(/Missing signing secret\(s\)[\s\S]*exit 1/)
    expect(s).not.toMatch(/variant=Debug/)
    expect(yml).not.toMatch(/assembleDebug|variant=Debug/)
  })

  it('checks the final APK manifest for allowBackup=false', () => {
    const s = step('Verify APK disallows backup')
    expect(s).toContain('dump xmltree')
    expect(s).toContain('android:allowBackup')
    expect(s).toContain("=(type 0x12)0x0")
    expect(s).toContain('exit 1')
  })

  it('asserts the data-extraction rules and fullBackupContent attributes and derives the APK path from the signing variant', () => {
    const s = step('Verify APK disallows backup')
    expect(s).toContain('android:dataExtractionRules')
    expect(s).toContain('android:fullBackupContent')
    expect(s).toContain('steps.signing.outputs.variant')
    expect(s).not.toContain('apk/release/app-release.apk')
  })

  it('versionCode guard accepts quoted/unquoted values and fails loudly instead of skipping', () => {
    const s = step('Check versionCode is an integer and did not decrease')
    expect(s).toContain('Could not read VERSION_CODE from the previous commit')
    expect(s).toContain('git rev-parse --verify --quiet HEAD~1')
    expect(s).not.toMatch(/\*\[!0-9\]\*\) PREV=""/)
    // behaviour of the parser itself, run with real bash
    const parse = /parse\(\) \{[^\n]*\}/.exec(s)![0]
    const run = (line: string) => execFileSync('bash', ['-c', `${parse}\nprintf '%s\\n' "$1" | parse`, 'x', line]).toString().trim()
    expect(run('          VERSION_CODE: "22"')).toBe('22')
    expect(run("          VERSION_CODE: '23'")).toBe('23')
    expect(run('          VERSION_CODE: 24 # c')).toBe('24')
    expect(run('          VERSION_CODE: "2x"')).toBe('2x')
    expect(run('          OTHER: 1')).toBe('')
  })

  it('checks versionCode is an integer that did not decrease, and leaves the version values alone', () => {
    const s = step('Check versionCode is an integer and did not decrease')
    expect(s).toContain('not a plain integer')
    expect(s).toContain('versionCode went down')
    expect(yml).toMatch(/VERSION_NAME: "\d+\.\d+\.\d+"/)
    expect(yml).toMatch(/VERSION_CODE: "\d+"/)
    expect(yml).toMatch(/fetch-depth: 2/)
  })

  it('does not publish a release or push anything', () => {
    expect(yml).not.toMatch(/gh release|softprops|create-release|git push|contents: write/)
  })
})
