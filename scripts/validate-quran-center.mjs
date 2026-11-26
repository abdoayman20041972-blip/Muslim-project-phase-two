#!/usr/bin/env node
/**
 * Prebuild integrity check for the local Quran-center data pack.
 * The pack is religious content and is never committed to the public repo:
 * it is generated locally (npm run build:quran-center) and injected into
 * public/data/ on the build machine. When it is absent (a plain clone/CI
 * runner) this check skips cleanly and the app simply shows the content as
 * not installed. When it is present, any missing, malformed, or still-HTML
 * file fails the build so a broken dataset never ships silently.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
// QC_DATA_ROOT overrides the data dir for tamper tests; production builds use public/data.
const DATA = process.env.QC_DATA_ROOT ? path.resolve(process.env.QC_DATA_ROOT) : path.join(ROOT, 'public', 'data')
const DIR = path.join(DATA, 'quran-center')
const fail = (message) => { console.error(`[quran-center] ${message}`); process.exit(1) }
const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')) } catch (e) { fail(`${path.basename(file)}: ${e.message}`) } }
const htmlTag = /<\/?[a-zA-Z][^>]*>/
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0

if (!existsSync(path.join(DIR, 'version.json'))) {
  console.log('[quran-center] data pack not installed (local-only content) - skipping validation')
  process.exit(0)
}
const versionFile = path.join(DIR, 'version.json')
const version = readJson(versionFile)
if (!/^\d{4}-\d{2}-\d{2}$/.test(version.dumpVersion || '')) fail('version.json has no dumpVersion')
if (version.source !== 'https://quranpedia.net') fail('version.json source changed unexpectedly')

const reviewStatus = readJson(path.join(DIR, 'review-status.json'))
const SCOPES = ['gharib', 'metadata', 'asbab', 'virtues']
const KNOWN = ['verified', 'pending-review', 'pending-reverification']
for (const scope of SCOPES) {
  if (!KNOWN.includes(reviewStatus?.scopes?.[scope]?.status)) {
    fail(`review-status.json missing/unknown scope "${scope}" (runtime gate fails closed without it)`)
  }
}
const pendingScopes = SCOPES.filter((s) => reviewStatus.scopes[s].status !== 'verified')
if (pendingScopes.length) {
  // A build over still-pending data is never silent: the runtime hides these
  // scopes, and review-only rendering requires the explicit non-production
  // VITE_QC_REVIEW_ONLY=1 flag at build time.
  console.log(`[quran-center] CONTENT GATE ACTIVE - locked scopes: ${pendingScopes.join(', ')} (hidden at runtime until independent review advances review-status.json)`)
}

const info = readJson(path.join(DIR, 'surahs-info.json'))
if (!Array.isArray(info) || info.length !== 114) fail('surahs-info.json must hold exactly 114 surahs')
info.forEach((row, i) => {
  if (row.surah !== i + 1) fail(`surahs-info row ${i} has surah=${row.surah}`)
  if (!['مكية', 'مدنية'].includes(row.type)) fail(`surah ${row.surah}: bad type "${row.type}"`)
  if (!Number.isInteger(row.descentOrder) || row.descentOrder < 1 || row.descentOrder > 114) fail(`surah ${row.surah}: bad descentOrder`)
  if (!isNonEmpty(row.introduction) || htmlTag.test(row.introduction)) fail(`surah ${row.surah}: introduction empty or still HTML`)
  if (row.grace && htmlTag.test(row.grace)) fail(`surah ${row.surah}: grace still HTML`)
})

let gharibAyahs = 0
for (let surah = 1; surah <= 114; surah++) {
  const file = path.join(DIR, 'gharib', `${surah}.json`)
  if (!existsSync(file)) continue
  const map = readJson(file)
  for (const [ayah, entries] of Object.entries(map)) {
    if (!(Number.parseInt(ayah, 10) >= 1)) fail(`gharib/${surah}.json: bad ayah key ${ayah}`)
    if (!Array.isArray(entries) || !entries.length) fail(`gharib/${surah}.json:${ayah} empty entry list`)
    for (const entry of entries) {
      if (!isNonEmpty(entry.book) || !isNonEmpty(entry.author)) fail(`gharib/${surah}.json:${ayah} missing book/author`)
      if (!Array.isArray(entry.words) || !entry.words.length) fail(`gharib/${surah}.json:${ayah} no words`)
      for (const word of entry.words) {
        if (!isNonEmpty(word.text) || !isNonEmpty(word.meaning)) fail(`gharib/${surah}.json:${ayah} blank word/meaning`)
        if (htmlTag.test(word.text) || htmlTag.test(word.meaning)) fail(`gharib/${surah}.json:${ayah} HTML left in word`)
      }
    }
    gharibAyahs++
  }
}
if (gharibAyahs !== 12) fail(`gharib heritage coverage changed: ${gharibAyahs} ayahs (expected exactly 12, Tier A filtered subset v5 per reviewer master table)`)
// ---- per-entry review provenance: every released gharib word must be listed ----
// in verified-entries.json (reviewer-qualified Tier A). Blanket unlock is not
// authorized: any entry without per-entry evidence fails the build.
const verified = readJson(path.join(DIR, 'verified-entries.json'))
if (!Array.isArray(verified?.entries)) fail('verified-entries.json missing or malformed (no per-entry review evidence)')
const normText = (t) => (t || '').replace(/[\u0610-\u061A\u064B-\u0652\u0670\u06D6-\u06ED\u06E5\u06E6\u0640]/g, '')
  .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627').replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064A').replace(/\u0649/g, '\u064A').replace(/[\s.,;:!?\u060C\u061B\u061F]+/g, '')
// Frozen reviewed bytes: each entry pins sha256 of the exact reviewed word and
// meaning strings. Regenerating files-manifest.json over mutated content cannot
// launder a change: the bytes are pinned here, in the reviewer-supplied evidence.
const sha256Text = (t) => createHash('sha256').update(t, 'utf8').digest('hex')
for (const e of verified.entries) {
  if (!/^[0-9a-f]{64}$/.test(e.word_sha256 || '') || !/^[0-9a-f]{64}$/.test(e.meaning_sha256 || '')) {
    fail(`verified-entries ${e.row_id}: missing pinned word_sha256/meaning_sha256 (reviewed bytes not frozen)`)
  }
}
const allowed = new Map(verified.entries.map((e) => [`${e.surah}:${e.ayah}:${e.book}:${normText(e.text)}`, e]))
let gharibWords = 0
for (const packDir of [DIR, path.join(DATA, 'quran-center-private')]) {
  const gdir = path.join(packDir, 'gharib')
  if (!existsSync(gdir)) continue
  for (const f of readdirSync(gdir)) {
    if (!f.endsWith('.json')) continue
    const surah = f.replace('.json', '')
    const map = readJson(path.join(gdir, f))
    for (const [ayah, entries] of Object.entries(map)) {
      for (const entry of entries) {
        for (const word of entry.words) {
          gharibWords++
          const evidence = allowed.get(`${surah}:${ayah}:${entry.book}:${normText(word.text)}`)
          if (!evidence) {
            fail(`gharib entry without review evidence: ${surah}:${ayah} ${entry.book} (blanket unlock is not authorized; only verified-entries.json Tier A may ship)`)
          }
          if (sha256Text(word.text) !== evidence.word_sha256) {
            fail(`gharib ${surah}:${ayah} ${entry.book}: word bytes differ from the reviewed bytes pinned in verified-entries.json (${evidence.row_id}); mutation + manifest regeneration does not pass`)
          }
          if (sha256Text(word.meaning) !== evidence.meaning_sha256) {
            fail(`gharib ${surah}:${ayah} ${entry.book}: meaning bytes differ from the reviewed bytes pinned in verified-entries.json (${evidence.row_id}); mutation + manifest regeneration does not pass`)
          }
        }
      }
    }
  }
}
if (gharibWords !== verified.entries.length) fail(`released gharib words (${gharibWords}) != verified-entries (${verified.entries.length})`)
console.log(`[quran-center] per-entry provenance verified (${verified.entries.length} Tier A entries)`)

let asbabCount = 0
const asbabPresent = existsSync(path.join(DIR, 'asbab'))
for (let surah = 1; surah <= 114 && asbabPresent; surah++) {
  const file = path.join(DIR, 'asbab', `${surah}.json`)
  if (!existsSync(file)) continue
  const map = readJson(file)
  for (const [ayah, text] of Object.entries(map)) {
    if (!isNonEmpty(text) || htmlTag.test(text)) fail(`asbab/${surah}.json:${ayah} empty or still HTML`)
    asbabCount++
  }
}
// Asbab ships only after the scholarly review passes; when it does ship, its
// coverage is pinned to the verified dump.
if (asbabPresent && asbabCount !== 564) fail(`asbab positions changed: ${asbabCount} (expected 564 from the pinned dump)`)

// ---- shipped-file hash verification: the pack must match its pinned manifest ----
// counts alone prove nothing about WHICH bytes ship; every file's sha256 is
// recomputed and compared, and missing/extra files fail the build.
import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
const manifestPath = path.join(DIR, 'files-manifest.json')
if (!existsSync(manifestPath)) fail('files-manifest.json missing: the pack has no pinned file hashes (regenerate with build-quran-center-data.mjs)')
const pinned = readJson(manifestPath)?.files
if (!pinned || typeof pinned !== 'object') fail('files-manifest.json has no files map')
const sha256File = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const actual = {}
for (const pack of ['quran-center', 'quran-center-private']) {
  const base = path.join(DATA, pack)
  if (!existsSync(base)) continue
  const walk = (sub) => {
    for (const entry of readdirSync(path.join(base, sub), { withFileTypes: true })) {
      const rel = sub ? `${sub}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(rel)
      else if (entry.isFile() && entry.name !== 'files-manifest.json') actual[`${pack}/${rel}`] = sha256File(path.join(base, rel))
    }
  }
  walk('')
}
for (const [rel, hash] of Object.entries(pinned)) {
  if (!(rel in actual)) fail(`files-manifest: pinned file missing on disk: ${rel}`)
  if (actual[rel] !== hash) fail(`files-manifest: sha256 mismatch: ${rel} (pack does not match its pinned manifest)`)
}
for (const rel of Object.keys(actual)) {
  if (!(rel in pinned)) fail(`files-manifest: unexpected file on disk not in pinned manifest: ${rel}`)
}
console.log(`[quran-center] file hashes verified (${Object.keys(pinned).length} files)`)

console.log(`[quran-center] OK - 114 surah infos, ${gharibAyahs} gharib ayahs${asbabPresent ? `, ${asbabCount} asbab positions` : ', asbab pending review'} (dump ${version.dumpVersion})`)
