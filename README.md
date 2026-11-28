# Muslim (مسلم)

Arabic (RTL) Islamic app for Android, built as a React web app wrapped with Capacitor. Personal-use app: Quran reader and recitation, azkar and tasbih, hadith, prophets' stories, prayer times, qibla, a reading library, radio and Haram live streams.

Release 2.0.0 (versionCode 25): build pending. Last built release: 1.4.21 (versionCode 24). Default branch: **main-2** (set 28 Nov 2026; the old `main` branch is the v1.2.7 line and is kept only as history).

## Stack
React 19, TanStack Router/Start, Vite, Tailwind 4, Capacitor 7 (Android), Vitest (jsdom). Two local Capacitor plugins in `plugins/` (background audio, exact alarms). Native glue is patched in during CI by `scripts/patch-android.mjs`.

## Commands
- `npm ci` then `npm run typecheck` (tsc strict), `npm test` (vitest), `npm run build` (runs the Quran page and Quran center validators first).
- Tests: 159 files / 1279 tests pass locally on the merged 2.0.0 candidate (12 vitest shards, tsc clean). CI count for the 2.0.0 build is added after the build.
- Lint: `bash scripts/lint.sh` (ESLint in its own folder; non-blocking in CI).

## Build and release
Build runs in GitHub Actions: Actions > Build Android APK > Run workflow, branch `main-2`. The workflow runs typecheck, tests, lint, CSP injection and a CSP smoke test, a versionCode check (must be higher than the previous commit), signing with the repo secrets, the permission check and the backup check, then uploads the signed APK as an artifact. Bump `VERSION_NAME` and `VERSION_CODE` in `.github/workflows/build-apk.yml` for every release. The signing key lives only in Actions secrets; every build uses the same certificate (SHA-256 `3B:40:B5:A8:24:B6:8F:76:B7:5B:13:DB:E1:BA:7D:1E:94:FA:77:A8:64:8F:15:17:FB:5B:F0:F1:B1:F0:A5:42`), so a new APK installs over the old one.

## Data and content rules
- The repo is public. It carries code and public heritage Quran data only. No private content, no private packs.
- Quran center data (`public/data/quran-center`) is generated from a pinned source and verified by sha256 (`files-manifest.json`, `scripts/validate-quran-center.mjs`). Do not edit it by hand.
- Books in `public/books` come with position maps (`*.posmap.json`); changing text lengths there needs the maps regenerated.
- Quran verse text uses Amiri (`.font-quran`); all other text uses Cairo.
- The Android backup is off (`allowBackup=false`, data extraction rules exclude everything); use the in-app export and import.

## Docs
- `CHANGELOG.md`: release notes.
- `docs/PHASE2-STATUS.md`: feature list and status (Arabic).
- `docs/HANDOFF-INTEGRATOR.md`: how publishing and building works, rules for the integrator.
- `docs/AUDIT-MAP.md`: component map, test map, known risks.
- `docs/quran-*.md`: Quran phase notes.
- `docs/MUSLIM_ARCHITECTURE_HANDOFF.md`, `docs/MUSLIM_HANDOFF_CURRENT.md`, `docs/UPGRADE-NOTES-v1.2.md`: historical, describe older architecture (Convex/Push) that no longer exists.
