# مركز القرآن (Quran Center)

Unified ayah card in the mushaf reader + surah information cards + memorization drills.

## Delivery model (owner decision, 2026-11-26)

**No religious content of this feature ever enters the public repository.** The
code is public; the data is not.

- `public/data/quran-center/` and `public/data/quran-center-private/` are both
  gitignored. A plain clone builds and runs without them; the affected tabs
  then say the content is not installed / under review instead of failing.
- The data pack is generated on the owner's machine (`npm run build:quran-center`),
  delivered privately (tarball + MANIFEST with per-file sha256), and injected
  into `public/data/` on the build machine before `npm run build` / the APK
  workflow. The app never calls a live API for these texts.
- `npm run validate:quran-center` is chained into prebuild: with the pack
  present it hard-fails on malformed data; without it, it skips cleanly.

## What the user sees

- **بطاقة الآية** (tap an ayah → تفسير): one bottom sheet with four tabs:
  1. **التفسير** — the existing tafsir sources, unchanged (الميسر offline, السعدي/ابن كثير/الطبري online).
  2. **معاني الكلمات** — gharib al-Quran per ayah: classical books (تذكرة الأريب، التبيان)
     merged with the contemporary books (السراج، كلمات القرآن) that live only in the
     private folder. Gharib covers difficult words only; the empty state says so.
  3. **سبب النزول** — al-Wahidi's narrations. **Excluded from the pack until the
     agreed scholarly review passes**; the tab says exactly that. After the review,
     regenerate with `INCLUDE_REVIEW_PENDING=1` and the tab shows the narrations
     verbatim under the takhrij notice.
  4. **الحفظ بالتكرار** — repeat an ayah or a range N times with a chosen reciter
     and a silence gap, optional hide-text self-testing (the ayah is masked in
     the mushaf; a peek button sits inside the card), progress in the mini
     player. Drills are never saved as resumable listening sessions.
- **عن السورة** — an (i) button in the reader header opens the surah card: type,
  revelation order, ayah/word counts, a brief. Reported virtues (فضل) are
  excluded until the same review passes; the card simply omits the section.

## Memorization audio: offline behavior (honest semantics)

Drill audio uses the existing per-ayah CDN (no new source, nothing silently
converted to offline). The CDN sends **no CORS headers**, so a page-context
`fetch()` of the audio fails while the media element plays it fine. Real
offline reuse therefore lives in a small service worker,
`public/quran-audio-sw.js`, registered on a best-effort basis when the
memorize panel opens:

- it intercepts only GETs for the recitation CDN path - app traffic is never
  touched;
- every ayah actually played is stored (a full copy, fetched without the
  media element's Range header) and later served cache-first, so previously
  played ayahs replay **without a connection**;
- when the service worker or Cache Storage is unavailable, drills are simply
  online-only and nothing claims otherwise;
- the form states the requirement up front, and an offline start is allowed
  only after `countCachedMemorizeAudio` has **verified** a stored copy for
  every ayah in the range - otherwise it is blocked with a clear message
  before anything plays. Cache availability is never promised, only checked.

## Data

| Content | Source | Pack location | Status |
| --- | --- | --- | --- |
| Gharib (تذكرة الأريب، التبيان) | Quranpedia dump 2026-11-24, sha256-verified | `quran-center/gharib/` | ships (heritage) |
| Surah info (114) without virtues | same | `quran-center/surahs-info.json` | ships |
| Asbab (الواحدي، 564) | same | generated only with `INCLUDE_REVIEW_PENDING=1` | **pending review** |
| Virtues (فضل السور) | same | same flag | **pending review** |
| Gharib (السراج، كلمات القرآن) | same | `quran-center-private/gharib/` | ships (contemporary, owner-licensed personal use) |

`ATTRIBUTION.md` + `version.json` inside the pack satisfy the dump licence
(credit + version on dataset redistribution) and pin the verified source files.

## Code map

- `src/app/features/quran/center/` — AyahCenterCard, MemorizePanel, SurahInfoCard,
  quranCenterData (loaders + validation), memorizeAudioCache (service-worker
  registration + verified cache counting), tests, data-integrity test (skips
  when the pack is absent).
- `public/quran-audio-sw.js` — runtime cache for recitation CDN audio only.
- `quranAudioSession.ts` — `memorize` request kind: per-ayah repeats, epoch-guarded
  silence gaps, no drill persistence. Playback uses the plain CDN URL (media
  elements need no CORS); offline reuse is the service worker's concern.
- `QuranAudioProvider.tsx` — `startMemorize` + `memorize` progress; mini player tracks drills.
- `QuranReaderView.tsx` — unified card wiring, surah info button, masked-ayah class.
- `scripts/quran-center-shots.mjs` — visual proof harness (needs `npm i -D playwright`; dev tool only).
