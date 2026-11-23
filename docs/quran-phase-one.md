# Quran phase one: review-only change

Base: 21506e9b990782e5f26ce270fd29ff93436cc8d5 (v1.2.7).
Prepared 2026-11-23. Not pushed, merged, deployed or released. No Android APK was built.

## Scope

- Replace the truncated three-page / nine-reference map with all 604 Medina Mushaf page boundaries and all 6236 ayah references.
- Validate page count, canonical keys, non-empty pages, ordered global ayah IDs, surah IDs, local verse numbers, every independent page-start boundary and the complete Fatiha on page 1.
- Run the same validator before `npm run build` and before accepting the dynamically loaded map in the reader.
- On a missing, malformed or incomplete map, render the full selected surah in scroll mode with an accessible warning, not an empty frame or a guessed page number. Preserve the saved layout preference unless the user explicitly chooses scroll mode. A full reload is offered because browsers can cache failed dynamic module imports.
- Validate new downloads before atomically replacing the map. The generator also compares all source text and verse IDs to the existing bundled Quran text before writing. Normal builds and reading do not fetch Quran data.
- Update old pagination tests to use actual verse IDs and actual Medina page numbers instead of a mocked incomplete map. Add corruption tests and a component fallback test.

The Quran text file was not changed. Audio, tafsir, downloads, notification controls and phase-six pagination-following behavior were not modified. Shared physical pages remain restricted to the selected surah, matching the current reader design. Thus 604 physical pages produce 662 surah/page groups. This is not a facsimile or fixed 15-line typesetting engine.

## Sources and provenance

Primary reference map, using the existing project source:
https://api.alquran.cloud/v1/quran/quran-uthmani
Documentation: https://legacy.alquran.cloud/api

Cross-check: all 604 page starts matched Tanzil Project metadata v1.0:
https://tanzil.net/res/text/metadata/quran-data.xml
Documentation: https://tanzil.net/docs/quran_metadata

Tanzil XML: copyright (C) 2008-2009 Tanzil.info, license cc-by as declared by the original metadata file. Source: Tanzil Project (tanzil.net).
`quran-page-starts.json` is a derived array of [surah, ayah] pairs in page order, copied from the XML page-start attributes, with no Quran text.
Original XML SHA-256: 8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a

Fetched and compared on 2026-11-23. All 6236 source ayah texts matched the already-bundled text literally; this is a technical consistency check, not independent religious certification.

## Reproduce

Use Node 22.18+ (tested with 22.23.5, matching the project's Node 22 CI family). Native Node TypeScript stripping is used by the validation scripts.

```sh
npm ci
npm run validate:quran-pages
npm run typecheck
npm run test:run
PRERENDER=1 npm run build
```

To deliberately regenerate the bundled map from the source, with network access:

```sh
node scripts/fetch-quran-pages.mjs
```

## Verification completed

- 604 non-empty page keys; 6236 unique ordered references; 114 complete surahs.
- All 604 page starts matched the separately downloaded Tanzil XML.
- `npm run typecheck`: passed.
- Entire test suite: 50 files, 465 tests passed.
- `PRERENDER=1 npm run build`: passed, including the new prebuild guard.
- The original HEAD's truncated map was rejected by the standalone validator with a nonzero exit status. A negative `npm run build` test also stopped before Vite started; the repaired map was then restored and revalidated.
- Production web app in headless desktop Chrome 157.0.8103.78, mobile-size viewport 390x844: opened all 114 surahs, clicked through every one of 662 surah/page groups and compared all 6236 rendered references with the map. No missing/duplicated references or uncaught page errors.
- Injected a failed map chunk and an invalid map chunk separately. Both displayed all 286 Baqara ayahs in scroll mode, an alert, and no page header or fake pagination.
- Actual rendered screenshots inspected: Fatiha page 1, Baqara page 2, Nas page 604, and the fallback warning with readable ayahs.

The production build logs an existing caught `localStorage is not defined` during server prerendering. It still succeeds and produces the static index. This pre-existing settings initialization is outside phase one.

## Not verified

No physical Android device, WebView, APK install or religious/typesetting review was performed. Screen-lock audio, background playback and other phases remain untouched. Test the packaged build on an Android device before release. The automatic follow-current-ayah pagination issue from phase six remains outside this patch.

## Review / apply

On a clean checkout of the base commit, inspect the patch and run:

```sh
git apply --check quran-phase-one.patch
git apply quran-phase-one.patch
```

Then run the verification commands above. The patch contains new files as well as modified files. Apply it from the repository root. No dependency was added to package.json and package-lock.json is unchanged. Reverting this patch returns the old incomplete map, so do not release that state.
