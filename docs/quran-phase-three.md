# Quran audio repair, phase three

Implemented over phases one and two on `main-2` only.

## Behavior

- One application-owned session manages full-surah online recordings, downloaded recordings and individual online ayahs. Reader unmounts, reading mode and navigation do not own or dispose audio.
- Connected playback tries the exact reciter/surah download first. A playback-time header guard rejects obvious non-audio data; decoder failure falls back online. This is not a download integrity guarantee. Download validation and management remain phase five.
- Every native playing/loading session uses the existing foreground service, partial Wake Lock and native MediaSession. Native calls are serialized so an old start cannot win after stop. Failure to start the service produces a warning.
- One mini player is available in and outside the reader, above the bottom navigation. Closing it stops audio and clears the saved position.
- Session identity is separate from reading selection. Tapping an ayah cannot relabel a different recording or create a phantom session.
- Full-surah files have no verified verse timestamps. The reader explicitly says they start at the beginning. Individual ayah audio remains available in the ayah toolbar. No fake seek-to-verse is offered.
- Ayah repeat works for individual ayah files. Surah repeat works for full-surah files. Inapplicable options are disabled. Connected playback may continue to the next surah unless data saver is on; a local session continues only if the next local recording passes the playback guard.
- All reader selectors and the mini player use the persisted reciter preference. Switching reciter preserves paused state but deliberately starts the new recording at its beginning because timing differs between recordings.
- Position is saved every five seconds of media progress, on pause, visibility changes and page exit. Reopening offers explicit resume, never unsolicited autoplay. Position is restored after metadata for the same recording identity. Switching reciter does not reuse inaccurate timestamps.
- Stop, new session and reciter switches invalidate stale local lookups and media callbacks. Next-surah continuation is cancellable. IndexedDB lookup has a ten-second fallback deadline; media initialization/stalls have a thirty-second recoverable error deadline. Errors and retry are visible.

## Verification and limits

Automated unit/component tests cover session ownership, cached-source selection, invalid media fallback, stale lookups, reciter changes, pause/resume, repeat, persistence, errors, deadlines and native start/stop ordering. Native bridge tests are mocks, not an Android device.

Browser verification uses real Chrome HTMLAudio playback with a generated 90-second WAV fixture stored under two reciter keys. It proves local-media lifecycle and UI behavior, not correctness of recitation providers: playback survives reader -> index -> home, pause survives reciter switch, and page reload allows explicit resume at second 19. Screenshots were inspected at 390 x 844.

Production prerender build and strict TypeScript check are required before closeout. Full test results and remote commit are reported with delivery.

No Java/native service code, notification controls, Audio Focus, download manager or phase-six settings changes are included. Notification buttons and native lock-screen action callbacks remain phase four. No release, merge or APK publication is included.

**Acceptance still requires a real Android device:** play a downloaded recording with the screen locked for ten minutes, verify no stutter, unlock, navigate between reader/index/home, pause, switch reciter, reopen and resume. A foreground service/Wake Lock improves the intended lifecycle but does not prove WebView audio survives every Android vendor's power management. This device acceptance condition is not claimed passed. Android SDK/JDK 21/device are not available in this environment; no native compile or APK test is claimed.
