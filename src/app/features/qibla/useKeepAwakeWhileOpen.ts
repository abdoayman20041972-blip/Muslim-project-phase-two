import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

/**
 * Keeps the screen on while the compass is open (the user is aligning the phone, so the screen
 * must not sleep). On leaving it restores what the global "keep screen awake" setting wants,
 * so that setting is never switched off by this screen.
 */
export function useKeepAwakeWhileOpen() {
  useEffect(() => {
    const settingWantsOn = () => readSetting(APP_SETTINGS_KEYS.keepScreenAwake, '0') === '1'
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const setNative = async (enabled: boolean) => {
      try {
        const { BackgroundAudio } = await import('@muslim/background-audio')
        await BackgroundAudio.setKeepScreenOn({ enabled })
      } catch (error) {
        console.debug('[useKeepAwakeWhileOpen]', error)
      }
    }
    const acquire = async () => {
      if (cancelled) return
      if (Capacitor.isNativePlatform()) {
        await setNative(true)
        return
      }
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch (error) {
        console.debug('[useKeepAwakeWhileOpen]', error)
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (Capacitor.isNativePlatform()) void setNative(settingWantsOn())
      else if (lock) {
        void lock.release()
        lock = null
      }
    }
  }, [])
}
