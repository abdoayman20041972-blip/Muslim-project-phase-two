# Audit map (snapshot of the audited tree, shipped as 1.4.10 code 13; updated for 2.0.0 code 25)

Update 28 Nov 2026: last built release is 2.0.0 (code 25), CI run 45: 159 test files / 1279 tests. Previous: 1.4.21 (code 24), CI run 44: 151 / 1219. Phases 1 to 4, copy buttons and the Hisn separator removal are in; see CHANGELOG.md. The test counts below are from 1.4.10.

Stack: React + TanStack Router/Vite, Capacitor Android, Vitest (jsdom). Two local Capacitor plugins in plugins/ (background audio, exact alarms). Native glue is patched in by scripts/patch-android.mjs during CI (workflow .github/workflows/build-apk.yml). The android/ folder is generated in CI, not in the repo.

## Component boundaries (proposed review units)
1. Quran: src/app/features/quran, src/quran-meta.ts, scripts/*quran*, public/data. Data integrity, audio provider, reader, bookmarks, phase docs in docs/quran-phase-*.md.
2. Prophets stories: src/app/features/prophets (60 files, ~7k lines, mostly story data). Content accuracy, rendering, generated data.
3. Library and books: src/app/features/library, src/app/features/seerah, public/books/*.json (+posmap). Completeness disclosures, reading position, CC BY-SA credit. Sifat al-Safwa and the PDF reader are removed.
4. Prayer, notifications, adhan: features/prayer, features/notifications, features/location, features/permissions, plugins/capacitor-exact-alarms, native/adhan.mp3. Scheduling, exact alarm, fire log, diagnostics.
5. Hadith, azkar, tasbih: features/hadith, azkar, tasbih, src/azkar-*.ts, src/app/features/sound (tap sound, native TapSounds).
6. Radio, Haram live, media: features/radio, features/haram, plugins/capacitor-background-audio.
7. Shell, settings, storage, backup, theming: src/app/App.tsx, components, features/settings, features/home, storage, backupValidation.ts, settings.ts, styles.css, router.
8. Build and release: workflow, scripts/apply-signing.py, patch-android.mjs, package.json, vite/vitest config.

## Test map
Vitest: __tests__/app (62 files, journeys, shell, azkar, backup, scheduling) plus colocated src/**/*.test.* (55 files). Last full CI (run 27, pre-Sifat-removal): 115 files / 992 tests passed, typecheck passed. Final local tree after Sifat removal and L6 fixes, verified on a clean `npm ci` copy (see HANDOFF-INTEGRATOR.md): 117 files / 997 tests pass (62 files / 388 in __tests__/app, 55 files / 609 in src), tsc clean. Covered by tests: prayer times and local timings, notification plan/routing/body/test-notification, exact-alarm scheduling, adhan sound registry, preferences mirror, settings reset, backup validation (all under __tests__/app). Gaps: the native Java side (AlarmFireReceiver, AdhanService) has no automated test and is only compiled in CI; permission prompts are untested; radio stall watchdog is tested with a fake audio element only, not on a device.

Current behavior, documented, NOT changed (needs a product decision): when the system turns notifications off for the app, scheduled prayer alarms cannot post their notification, so the adhan does not play. The in-app setting does not override this. Not device-verified.

Backup: book reading positions (library-pos2-*) are included in export/import with value validation; legacy library-pos-* keys are not exported and are migrated in place by BookViewer.

## Known unresolved runtime risks (device-only, not proven)
- Tap-sound delay: native TapSounds compiled in 1.4.8 and 1.4.9, device effect unconfirmed.
- Adhan: recording swap unapproved, never claim "never silent".
- Previous Sifat PDF screen crash was never reproduced; the PDF reader is now removed.
- Hadith footnote removal unapproved.
- Books are partial by source: Siyar vols 1-10 only, history lacks vol 7 p362-366; Siyar notes say text is unverified against scans.
- Notifications/prayer have no unit tests.
- Radio and Haram streams were confirmed working by the user; do not alter without cause.

## Rules for reviewers
Read-only audit: report findings, do not edit the tree. Do not edit vite.config.ts. package-lock.json is a stub. Do not publish preview/, research/, .output, tsconfig.tsbuildinfo. No network posts, no account use.

Book data cleanup (audit W1): 12 guarded edits applied to public/books/siyar-nubala.json (8 scrape-only paragraphs removed, 1 OCR Latin letter in "لأنه" fixed) and bidaya-prophets.json (1 empty template removed, 2 templates unwrapped, text kept). Chapter counts unchanged (1648 and 154). Per-edit before/after trace from the reviewer: clean-trace.json. Siyar paragraphs 5891, Prophets 2971 after the edits. Genuine editorial bracket paragraphs were kept.
