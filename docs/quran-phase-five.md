# Quran audio repair, phase five

Implemented over phases one to four on `main-2` only. Scope: the download manager (issues س09, س12, س13, س14, ج3, ج5).

## Behavior

- Downloads now run in a module-level manager that lives independently of the settings screen: leaving the screen does not stop a job, and any screen can subscribe to live job state. One job per reciter; a second start request returns the live job instead of duplicating work.
- A single global pool caps concurrent file downloads at 2 across all reciters, so two library downloads cannot multiply connections (س12).
- Every surah is validated before it is stored: the response must not be HTML (content-type check), the first bytes must be an MP3 (ID3 tag or frame sync), the body must be at least 16 KB, and when the server declares a content length the received bytes must match it. A corrupt or truncated file is marked failed, never stored, and can never appear as "downloaded" (س09).
- Byte-level progress: the body is read through `response.body.getReader()`, so the UI shows the current surah's percentage, received bytes and speed instead of only counting finished surahs (س13, ج3).
- A 30-second stall watchdog aborts a body that stops arriving (the old timeout covered only the wait for headers). Retries with backoff apply to network and stall failures; a user pause/cancel and a definitely-not-audio response are never retried (ج3).
- Pause keeps every completed surah and resumes from the first incomplete one. The surah in flight when pausing restarts from byte zero on resume — MP3Quran supports Range requests, but byte-range resume inside one surah is intentionally left as a later improvement and is not claimed here. Cancel removes the job and clears the transient status so nothing looks half-downloaded (ج3).
- Failed surahs are summarized per reciter with the surah name and a short reason (network, server error, not audio, incomplete, stalled, storage), and "retry failed" re-downloads only those surahs (س14).
- A `downloading` status row left behind by a killed session is reset automatically on the next status read, so a surah never looks half-downloaded after an app restart (س12).
- Storage figures are measured, not estimated: per-reciter space is summed from the recorded sizes of the stored files, free space comes from `navigator.storage.estimate()`, and the persistent-storage request outcome is shown (granted / not granted) (س13).
- The settings section is now a download manager: an "active now" card with pause, resume and cancel, per-reciter cards with real size and failure lists, a confirmation step before a full-library download that states the estimated size, the approximate free space and a Wi-Fi-only option, and comfortable font sizes instead of 9–10 px (ج5).
- Wi-Fi-only uses `navigator.connection.type` when the device reports it. If the connection is not Wi-Fi (or the device cannot report the type), the job pauses itself with a visible "waiting for Wi-Fi" state instead of consuming mobile data.

## Verification and limits

- Vitest: 12 engine tests cover validation (HTML page, non-MP3 bytes, truncated body), pause/resume/cancel semantics, retry-failed-only, the global concurrency ceiling, byte progress events, the Wi-Fi-only pause, storage measurement and deletion. 5 UI tests cover the manager states, the confirmation step, the one-place job controls and single-surah actions. Full suite: 516 tests, `tsc --strict` and the production build all pass.
- The fetch used for streaming intentionally does not use `fetchWithTimeout`: that helper detaches the caller's abort signal once headers arrive, which would make pause/cancel powerless mid-body. The stall watchdog covers the header wait with the same 30-second budget.
- Not covered by automated tests: real IndexedDB (tests use a fake), a real network, and real-device behavior such as OS-level connection changes, background throttling of the page during long downloads, and actual Wi-Fi transitions. Byte-range resume inside one surah is not implemented (see above). No APK build or device matrix is claimed; the phase-three locked-screen offline check also remains outstanding.
- No merge to `main`, no release.
