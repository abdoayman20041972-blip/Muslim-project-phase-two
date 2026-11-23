# Quran audio repair, phase four

Implemented over phases one to three on `main-2` only. Scope: notification and lock-screen media controls, Audio Focus, interruption policy, notification permission.

## Behavior

- The native service now lives as long as a recitation session exists (loading, playing or paused), not only while playing. Pausing keeps the notification and lock-screen card so playback can be resumed from them. Stop, close or an error ends the service.
- The notification uses `MediaStyle` with a pause/play button and a close button, public lock-screen visibility, and the surah and reader as title and text. Close (and swiping away a paused notification) stops the audio and the service.
- `MediaSession` has a callback. Lock-screen and headset play, pause and stop are forwarded to the web layer as a `mediaAction` event. The audio element stays the source of truth: the web layer applies the action, then sends the resulting state (playing flag, position, duration) back, which updates the notification and session state. The service never fakes a state.
- Audio Focus is requested when playback starts (media usage, speech content type, pause instead of duck). Transient loss (call, alarm, navigation prompt) pauses and resumes automatically only if focus returns and the user has not paused manually. Permanent loss pauses and never resumes automatically. Headphone unplug (`ACTION_AUDIO_BECOMING_NOISY`) pauses without auto-resume.
- The partial Wake Lock is held only while playing and released on pause.
- Android 13+: `POST_NOTIFICATIONS` is requested once per app launch, after the first session starts. If denied, the service still runs but the user sees a message that notification and lock-screen controls will not appear.
- Notification close/buttons depend on the web layer being alive. If the WebView process is gone, a button press stops the service.

## Verification and limits

- Vitest: web-layer handling of every action, focus policy, permission request, listener cleanup, and service lifecycle (mock bridge, not a device).
- Native: `./gradlew :app:assembleDebug` succeeds on a project generated with `cap add android` (JDK 21, compileSdk 35/36). This proves the Java compiles, links against androidx.media, and merges the manifest. It does not prove runtime behavior.
- Not tested on any device or emulator: notification appearance, button behavior, lock-screen card, headset keys, call interruption, Android 13+ permission prompt, whether WebView audio and Chromium's own audio-focus handling conflict with this Audio Focus request, whether events reach JavaScript while the screen is locked, vendor power management. These need a real phone. The ten-minute locked-screen offline acceptance from phase three also remains outstanding.
- No APK is published, no release, no merge to `main`. Download manager and settings work remain later phases.
