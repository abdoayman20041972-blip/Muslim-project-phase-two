# Changelog

Versions 1.4.11 to 1.4.19 are not reconstructed here; their commits are in git history on `main-2`.

## 1.4.21 (versionCode 24)
- Removed the dataset "*" verse separators from four Hisn al-Muslim items (awakening: Al Imran 3:190-200; travel: Az-Zukhruf 43:13-14; sleep: Ayat al-Rasul 2:285-286; after prayer: Ikhlas, Falaq, Nas). Each separator became one space; no Arabic word changed. Tests compare the word sequence with the previous text and each verse part with the bundled Uthmani text.
- `main-2` became the GitHub default branch.
- CI run 44: typecheck, 151 test files / 1219 tests, signed release build.

## 1.4.20 (versionCode 23)
Merge of audit phases 1 to 4 and the copy feature.
- Phase 1: daily ayahs checked against the mushaf (wrong entries fixed, e.g. 16:128); Ayat al-Kursi and Ikhlas/Falaq/Nas added to morning and evening azkar and Ikhlas/Falaq/Nas to sleep; brackets removed from six Hisn items; backup import is atomic with rollback; export on Android uses the share sheet.
- Phase 2: back button handling (overlay stack, history); Cairo font everywhere except Quran verse text (Amiri); label fixes; 11px text review.
- Phase 3: `allowBackup=false` forced at build and checked in CI; workflow hardening (read-only token permissions, signing secrets required, actions pinned to commit SHAs, versionCode must increase); adhan uses notification audio usage (silent under Do Not Disturb) and a transient audio focus (Quran pauses and resumes around the adhan).
- Phase 4: documentation refresh, dead code removal, ESLint (non-blocking CI step), attribution in About, Content-Security-Policy with script hashes and a CSP smoke test in CI, data extraction rules, charset meta kept in the first 1024 bytes.
- Copy: copy buttons (ayah, tafsir, gharib, asbab, daily ayah, azkar, hadith, prophets' stories, essentials, library chapter) with the toast "تم النسخ" or "تعذّر النسخ". Uses the clipboard API with a hidden-textarea fallback for old WebViews. The global copy block and `user-select: none` elsewhere are unchanged.
- Favorites copy includes the dhikr source.
- CI run 46081477037: success. APK SHA-256 `8125837200287c01b142f32955468aeb1a65d71df1e91e002d6db396a3673fff`.

## 1.4.10 (versionCode 13)
See `docs/PHASE2-STATUS.md` (Sifat al-Safwa removed, review cleanup, `npm ci`).
