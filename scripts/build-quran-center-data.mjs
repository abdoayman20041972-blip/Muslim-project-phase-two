#!/usr/bin/env node
/**
 * Builds the bundled Quran-center data from the official Quranpedia dumps.
 *
 * Sources (pinned + verified):
 *   https://quranpedia.net/dumps/manifest.json     - dump version + sha256 of every file
 *   https://quranpedia.net/dumps/LICENSE.md        - free in-app use, no attribution required
 *
 * What lands where:
 *   public/data/quran-center/          - classical (heritage) works + Quranpedia-authored
 *                                        surah metadata. Rights-clean to commit. Carries
 *                                        ATTRIBUTION.md + version.json as the license asks
 *                                        for any redistributed dataset.
 *   public/data/quran-center-private/  - contemporary works (still the property of their
 *                                        authors/publishers). GITIGNORED: generated locally
 *                                        on the owner's machine, never uploaded to the repo.
 *                                        The app merges these files at runtime when present.
 *
 * No text is paraphrased, summarized or generated: book text is copied verbatim and only
 * HTML markup is converted to plain text.
 */
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { mkdir, writeFile, readFile, copyFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const BASE = 'https://quranpedia.net/dumps'
const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'public', 'data', 'quran-center')
const OUT_PRIVATE = path.join(ROOT, 'public', 'data', 'quran-center-private')
const CACHE = process.env.QC_DUMP_CACHE || path.join(ROOT, '.cache', 'quran-center-dumps')

// Book ids inside meanings.json.gz (verified against books.json.gz on 2026-11-26).
const HERITAGE_GHARIB = [
  { id: 208, name: 'تذكرة الأريب في تفسير الغريب', author: 'ابن الجوزي (ت ٥٩٧هـ)' },
  { id: 327, name: 'التبيان في تفسير غريب القرآن', author: 'ابن الهائم (ت ٨١٥هـ)' },
]
const MODERN_GHARIB = [
  { id: 491, name: 'السراج في بيان غريب القرآن', author: 'محمد بن عبد العزيز الخضيري' },
  { id: 1424, name: 'كلمات القرآن', author: 'حسنين محمد مخلوف' },
]
const ASBAB_WAHIDI = { file: 'asbab-book-2919.json.gz', name: 'أسباب نزول القرآن', author: 'الواحدي (ت ٤٦٨هـ)' }
// Revelation-cause narrations and reported virtues stay OUT of the generated
// pack until the agreed scholarly review clears them (owner decision relayed
// 2026-11-26: a notice alone is not enough). Regenerate with
// INCLUDE_REVIEW_PENDING=1 once the review passes.
const INCLUDE_REVIEW_PENDING = process.env.INCLUDE_REVIEW_PENDING === '1'
const NEEDED = INCLUDE_REVIEW_PENDING
  ? ['meanings.json.gz', 'surahs.json.gz', ASBAB_WAHIDI.file]
  : ['meanings.json.gz', 'surahs.json.gz']

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

async function download(name) {
  const cached = path.join(CACHE, name)
  if (existsSync(cached)) return readFile(cached)
  const response = await fetch(`${BASE}/${name}`)
  if (!response.ok) throw new Error(`download failed ${name}: HTTP ${response.status}`)
  const buf = Buffer.from(await response.arrayBuffer())
  await mkdir(CACHE, { recursive: true })
  await writeFile(cached, buf)
  return buf
}

/** Convert the dumps' simple HTML to plain text. Verbatim words, markup only. */
export function cleanBookHtml(html) {
  if (typeof html !== 'string') return ''
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((line) => line.trim()).join('\n')
    .trim()
}

async function main() {
  const manifest = JSON.parse((await download('manifest.json')).toString('utf8'))
  const expected = new Map(manifest.files.map((f) => [f.name, f.sha256]))
  console.log(`dump version ${manifest.version}`)

  const raw = new Map()
  for (const name of NEEDED) {
    const buf = await download(name)
    const digest = sha256(buf)
    if (expected.get(name) !== digest) throw new Error(`sha256 mismatch for ${name}: got ${digest}`)
    raw.set(name, JSON.parse(gunzipSync(buf).toString('utf8')))
    console.log(`verified ${name} (${digest.slice(0, 12)}…)`)
  }

  // ---- gharib: split per surah, heritage (public) and modern (private) apart ----
  const meanings = raw.get('meanings.json.gz').data
  const pick = (books) => {
    const perSurah = new Map()
    for (const row of meanings) {
      for (const entry of row.meanings) {
        const meta = books.find((b) => b.id === entry.book_info.id)
        if (!meta) continue
        const words = (entry.words || [])
          .filter((w) => typeof w?.text === 'string' && typeof w?.meaning === 'string' && w.text.trim() && w.meaning.trim())
          .map((w) => ({ text: w.text.trim(), meaning: w.meaning.trim() }))
        if (!words.length) continue
        if (!perSurah.has(row.surah)) perSurah.set(row.surah, {})
        const surahMap = perSurah.get(row.surah)
        ;(surahMap[row.ayah] ??= []).push({ book: meta.name, author: meta.author, words })
      }
    }
    return perSurah
  }
  const writePerSurah = async (dir, perSurah) => {
    const outDir = path.join(dir, 'gharib')
    await mkdir(outDir, { recursive: true })
    let ayahCount = 0
    for (const [surah, map] of [...perSurah.entries()].sort((a, b) => a[0] - b[0])) {
      ayahCount += Object.keys(map).length
      await writeFile(path.join(outDir, `${surah}.json`), JSON.stringify(map))
    }
    return { surahs: perSurah.size, ayahCount }
  }
  const heritageStats = await writePerSurah(OUT, pick(HERITAGE_GHARIB))
  const modernStats = await writePerSurah(OUT_PRIVATE, pick(MODERN_GHARIB))
  console.log(`gharib heritage: ${heritageStats.ayahCount} ayahs in ${heritageStats.surahs} surahs`)
  console.log(`gharib modern (private, gitignored): ${modernStats.ayahCount} ayahs in ${modernStats.surahs} surahs`)

  // ---- asbab al-nuzul: al-Wahidi (heritage), verbatim with markup cleaned ----
  // Excluded until the scholarly review passes; see INCLUDE_REVIEW_PENDING above.
  if (INCLUDE_REVIEW_PENDING) {
    const asbab = raw.get(ASBAB_WAHIDI.file).ayahs
    const asbabDir = path.join(OUT, 'asbab')
    await mkdir(asbabDir, { recursive: true })
    const asbabPerSurah = new Map()
    for (const row of asbab) {
      const text = (row.content || []).map((c) => cleanBookHtml(c.text)).filter(Boolean).join('\n\n')
      if (!text) continue
      if (!asbabPerSurah.has(row.surah)) asbabPerSurah.set(row.surah, {})
      asbabPerSurah.get(row.surah)[row.ayah] = text
    }
    let asbabCount = 0
    for (const [surah, map] of [...asbabPerSurah.entries()].sort((a, b) => a[0] - b[0])) {
      asbabCount += Object.keys(map).length
      await writeFile(path.join(asbabDir, `${surah}.json`), JSON.stringify(map))
    }
    console.log(`asbab (al-Wahidi): ${asbabCount} positions in ${asbabPerSurah.size} surahs`)
  } else {
    console.log('asbab (al-Wahidi): excluded pending scholarly review')
  }

  // ---- surah information cards (Quranpedia-authored metadata) ----
  const surahs = raw.get('surahs.json.gz').data
  const info = surahs.map((row) => {
    const fields = row.information || {}
    const value = (key) => cleanBookHtml(fields[key]?.value ?? '')
    return {
      surah: row.surah,
      type: value('surah_type'),
      descentOrder: Number.parseInt(value('descent'), 10) || null,
      wordsCount: Number.parseInt(value('words_count').replace(/[^\d]/g, ''), 10) || null,
      introduction: value('introduction'),
      // Reported virtues (فضل) are unreviewed narrations: omitted until the
      // scholarly review passes (INCLUDE_REVIEW_PENDING=1).
      ...(INCLUDE_REVIEW_PENDING ? { grace: value('grace') } : {}),
    }
  }).sort((a, b) => a.surah - b.surah)
  if (info.length !== 114) throw new Error(`expected 114 surah info rows, got ${info.length}`)
  await writeFile(path.join(OUT, 'surahs-info.json'), JSON.stringify(info))
  console.log(`surah info: ${info.length} surahs`)

  // ---- provenance: version pinning + license-required attribution ----
  await writeFile(path.join(OUT, 'version.json'), JSON.stringify({
    source: 'https://quranpedia.net',
    dumpVersion: manifest.version,
    generatedAt: new Date().toISOString(),
    files: Object.fromEntries(NEEDED.map((n) => [n, expected.get(n)])),
    books: {
      gharibHeritage: HERITAGE_GHARIB,
      gharibModernPrivate: MODERN_GHARIB,
      reviewPending: !INCLUDE_REVIEW_PENDING,
      ...(INCLUDE_REVIEW_PENDING
        ? { asbab: { ...ASBAB_WAHIDI, sha256: expected.get(ASBAB_WAHIDI.file) } }
        : {}),
    },
    changesFeed: `https://quranpedia.net/api/v1/changes?since=${manifest.version}`,
  }, null, 2))
  await writeFile(path.join(OUT, 'ATTRIBUTION.md'), [
    '# مصدر بيانات مركز القرآن',
    '',
    `المصدر: الموسوعة القرآنية (Quranpedia.net) — https://quranpedia.net`,
    `إصدار النسخة: ${manifest.version}`,
    '',
    'الرخصة: الاستخدام داخل التطبيقات مجاني ولا يشترط الإسناد؛ وعند إعادة نشر البيانات',
    'كمجموعة قابلة للتنزيل يلزم ذكر المصدر مع رابطه ورقم الإصدار (هذا الملف).',
    'النص الكامل للرخصة: https://quranpedia.net/dumps/LICENSE.md',
    '',
    'الكتب التراثية المضمنة هنا (تذكرة الأريب لابن الجوزي، التبيان لابن الهائم) تراث',
    'مشترك. أسباب النزول وفضائل السور المروية مستبعدة في هذه النسخة لحين اكتمال',
    'المراجعة العلمية المتفق عليها. الأعمال المعاصرة (السراج في بيان غريب القرآن،',
    'كلمات القرآن) لا تُنشر هنا؛ تُولَّد محليًا على جهاز المستخدم في مجلد',
    'quran-center-private وتبقى ملكًا لأصحابها.',
  ].join('\n'))
  // ---- content gate: every scope stays locked until independent review evidence ----
  // Ships inside the data pack; the runtime fails CLOSED per scope when absent.
  // Written BEFORE the corrections overlay so the overlay is the ONLY advance
  // path: a scope flips to 'verified' only by an overlay review-status.json
  // backed by independent-review evidence - never by editing this default.
  await writeFile(path.join(OUT, 'review-status.json'), JSON.stringify({
    batch: 'corrections-v5',
    scopes: {
      gharib: { status: 'pending-reverification', note: 'RELEASE = Tier A entries only (reviewer master table 2026-11-26: canonical placement + book-context + gloss match), listed one by one in verified-entries.json with per-entry provenance (row_id, source pointer). Everything else - Tier B/C, weak/no-text moves, phrase-only content - is HELD in the private pending store, not lost. Canonical phrase attestation was never semantic certification; blanket gharib unlock is expressly not authorized. Small partial reviewed coverage only.' },
      metadata: { status: 'pending-review', note: 'Fidelity 114/114 verified by the independent reviewer; makki/madani + descentOrder labeling decision still open (review report §3D/§3E).' },
      asbab: { status: 'pending-review', note: 'al-Wahidi chains ungraded (weak/fabricated reports); per-report takhrij + notice posture await the specialist.' },
      virtues: { status: 'pending-review', note: 'Grace sections carry weak/ungraded hadiths (Tirmidhi 2895, Ahmad 6643; Ya-Sin grace36); specialist takhrij pending.' },
    },
  }, null, 2))
  console.log('wrote review-status.json (all scopes pending)', '(runtime-gated)')
  // Fail-closed default: an empty verified-entries manifest. The corrections
  // overlay replaces it with the reviewer-qualified Tier A list; without that
  // evidence the validator refuses ANY released gharib entry.
  await writeFile(path.join(OUT, 'verified-entries.json'), JSON.stringify({
    batch: 'none', rule: 'no gharib entry may ship without per-entry review evidence (corrections overlay supplies verified-entries.json)', entries: [],
  }, null, 2))


  // ---- content-review corrections overlay (v1, 2026-11-26) ----
  // Reviewer-verified fidelity fixes (misplaced gharib entries, Word/HTML
  // boilerplate) live OUTSIDE the repo in .cache/quran-center-corrections/
  // and are re-applied after every regeneration so religious text never
  // enters git. See .cache/quran-center-corrections/CHANGELOG.md. Runs LAST
  // (after review-status.json) so it remains the sole scope-advance path.
  const corrRoot = path.join(ROOT, '.cache', 'quran-center-corrections')
  if (existsSync(corrRoot)) {
    let applied = 0
    const overlay = async (rel) => {
      const from = path.join(corrRoot, rel)
      const to = path.join(ROOT, 'public', 'data', rel)
      if (existsSync(from)) { await mkdir(path.dirname(to), { recursive: true }); await copyFile(from, to); applied++ }
    }
    for (const f of await readdir(path.join(corrRoot, 'quran-center', 'gharib'))) await overlay(path.join('quran-center', 'gharib', f))
    if (existsSync(path.join(corrRoot, 'quran-center-private')))
      for (const f of await readdir(path.join(corrRoot, 'quran-center-private', 'gharib'))) await overlay(path.join('quran-center-private', 'gharib', f))
    await overlay(path.join('quran-center', 'surahs-info.json'))
    await overlay(path.join('quran-center', 'review-status.json'))
    await overlay(path.join('quran-center', 'verified-entries.json'))
    console.log(`corrections overlay: re-applied ${applied} reviewer-verified files`)
  }

  // ---- shipped-file manifest: sha256 of every file the pack ships ----
  // Written after generation + overlay so it pins the FINAL bytes. The
  // validator recomputes and compares: a tampered, stale or partial pack
  // fails the build instead of shipping silently.
  const hashTree = async (dir, rel) => {
    const out = {}
    if (!existsSync(dir)) return out
    const walk = async (sub) => {
      for (const entry of await readdir(path.join(dir, sub), { withFileTypes: true })) {
        const r = sub ? `${sub}/${entry.name}` : entry.name
        if (entry.isDirectory()) await walk(r)
        else if (entry.isFile() && entry.name !== 'files-manifest.json') out[`${rel}/${r}`] = sha256(await readFile(path.join(dir, r)))
      }
    }
    await walk('')
    return out
  }
  const filesManifest = {
    generatedAt: new Date().toISOString(),
    files: { ...(await hashTree(OUT, 'quran-center')), ...(await hashTree(OUT_PRIVATE, 'quran-center-private')) },
  }
  await writeFile(path.join(OUT, 'files-manifest.json'), JSON.stringify(filesManifest, null, 2))
  console.log(`files-manifest.json: pinned ${Object.keys(filesManifest.files).length} shipped files`)

  console.log('wrote version.json + ATTRIBUTION.md')
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.dirname, 'build-quran-center-data.mjs')
if (isMain) main().catch((error) => { console.error(error); process.exit(1) })
