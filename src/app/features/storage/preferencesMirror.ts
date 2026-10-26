import { Capacitor } from '@capacitor/core'
import { isBackupKey } from '../../settings'

// WebView storage can be cleared by the system or by an app-data wipe. This
// keeps a copy of the app's persistent keys (settings, prayer coordinates,
// azkar progress, favorites...) in native Android SharedPreferences through
// @capacitor/preferences, and restores whatever is missing at startup.
// localStorage stays the source of truth for the rest of the app, and the
// existing export/import backup is untouched.

const MIGRATED_FLAG = 'muslim_mirror_v1_done'
const RELOAD_GUARD = 'muslim_mirror_reloaded'
const SYNC_INTERVAL_MS = 60_000

let started = false
const lastMirrored = new Map<string, string>()

function mirroredKeysInLocalStorage(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isBackupKey(key)) keys.push(key)
  }
  return keys
}

async function loadPreferences() {
  const { Preferences } = await import('@capacitor/preferences')
  return Preferences
}

/** Copies changed keys to native storage and removes keys deleted during this session. */
export async function syncPreferencesMirror(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const Preferences = await loadPreferences()
    const present = new Set<string>()
    for (const key of mirroredKeysInLocalStorage()) {
      const value = localStorage.getItem(key)
      if (value === null) continue
      present.add(key)
      if (lastMirrored.get(key) === value) continue
      await Preferences.set({ key, value })
      lastMirrored.set(key, value)
    }
    for (const key of [...lastMirrored.keys()]) {
      if (present.has(key)) continue
      await Preferences.remove({ key })
      lastMirrored.delete(key)
    }
  } catch (error) {
    console.error('[storage] preferences mirror sync failed', error)
  }
}

/**
 * Startup: the first run only mirrors what already exists (one-time migration).
 * Later runs restore keys that are missing from localStorage, then reload once
 * so every screen reads the restored values.
 */
export async function restorePreferencesMirror(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const Preferences = await loadPreferences()
    const migrated = (await Preferences.get({ key: MIGRATED_FLAG })).value === '1'
    if (!migrated) {
      await syncPreferencesMirror()
      await Preferences.set({ key: MIGRATED_FLAG, value: '1' })
      return false
    }
    const { keys } = await Preferences.keys()
    let restored = 0
    for (const key of keys) {
      if (key === MIGRATED_FLAG || !isBackupKey(key)) continue
      if (localStorage.getItem(key) !== null) continue
      const { value } = await Preferences.get({ key })
      if (value === null) continue
      localStorage.setItem(key, value)
      lastMirrored.set(key, value)
      restored++
    }
    if (restored > 0 && sessionStorage.getItem(RELOAD_GUARD) !== '1') {
      sessionStorage.setItem(RELOAD_GUARD, '1')
      window.location.reload()
      return true
    }
    return false
  } catch (error) {
    console.error('[storage] preferences restore failed', error)
    return false
  }
}

/** Call once at app start. Returns a cleanup function. */
export function startPreferencesMirror(): () => void {
  if (!Capacitor.isNativePlatform() || started) return () => {}
  started = true
  let timer = 0
  const syncNow = () => void syncPreferencesMirror()
  const onHidden = () => {
    if (document.visibilityState === 'hidden') syncNow()
  }
  void restorePreferencesMirror().then((reloading) => {
    if (reloading) return
    void syncPreferencesMirror()
    timer = window.setInterval(syncNow, SYNC_INTERVAL_MS)
  })
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('pagehide', onHidden)
  window.addEventListener('azkar-settings-changed', syncNow)
  return () => {
    started = false
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('pagehide', onHidden)
    window.removeEventListener('azkar-settings-changed', syncNow)
  }
}
