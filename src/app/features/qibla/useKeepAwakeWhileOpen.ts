import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'

/**
 * Keeps the screen on while the compass is open (the user is aligning the phone, so the screen
 * must not sleep). On leaving it restores what the global "keep screen awake" setting wants,
 * so that setting is never switched off by this screen.
 *
 * Native calls are serialized on one chain, so the restore on leaving always runs after a
 * pending acquire. A web wake lock that resolves after the screen was left is released at once.
 */
export function useKeepAwakeWhileOpen() {
  useEffect(() => {
    const settingWantsOn = () => readSetting(APP_SETTINGS_KEYS.keepScreenAwake, '0') === '1'
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    let chain: Promise<void> = Promise.resolve()
    const setNative = (enabled: boolean) => {
      chain = chain.then(async () => {
        try {
          const { BackgroundAudio } = await import('@muslim/background-audio')
          await BackgroundAudio.setKeepScreenOn({ enabled })
        } catch (error) {
          console.debug('[useKeepAwakeWhileOpen]', error)
        }
      })
    }
    const acquire = async () => {
      if (cancelled) return
      if (Capacitor.isNativePlatform()) {
        setNative(true)
        return
      }
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        lock = sentinel
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
      if (Capacitor.isNativePlatform()) setNative(settingWantsOn())
      else if (lock) {
        void lock.release()
        lock = null
      }
    }
  }, [])
}
