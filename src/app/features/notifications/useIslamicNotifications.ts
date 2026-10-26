import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { getNotificationPermission, showAppNotification } from './notifications'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'
import { dailyAyahFor } from '../../../daily-ayahs'
import { dateKey, getTimings, parsePrayerTime, readPrayerCoords, type Timings } from '../prayer/prayerTimes'

const DAILY_AYAH_KEY='azkar_daily_ayah_notification_date'
const QURAN_REMINDER_KEY='azkar_quran_reminder_notification_date'
const AZKAR_KEY='azkar_azkar_notification_date'

function enabled(key:string){return readSetting(key,'0')==='1'}

export function useIslamicNotifications() {
  const timers = useRef<number[]>([])
  const runId = useRef(0)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return // native local notifications handle everything
    let cancelled = false
    const clear = () => {
      timers.current.forEach(id => window.clearTimeout(id))
      timers.current = []
    }

    const schedule = async () => {
      const id = ++runId.current
      clear()
      if (getNotificationPermission() !== 'granted') return

      const now = new Date()
      const todayKey = dateKey(now)

      if (enabled(APP_SETTINGS_KEYS.dailyAyah) && readSetting(DAILY_AYAH_KEY) !== todayKey) {
        if (!cancelled) {
          const target = new Date(now)
          target.setHours(0, 0, 0, 0)
          if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1)
          const delay = target.getTime() - Date.now()
          timers.current.push(window.setTimeout(() => {
            const today = new Date()
            const key = dateKey(today)
            if (getNotificationPermission() === 'granted' && enabled(APP_SETTINGS_KEYS.dailyAyah) && readSetting(DAILY_AYAH_KEY) !== key) {
              const ayah = dailyAyahFor(today)
              void showAppNotification('آية اليوم', ayah.text + ' — ' + ayah.surah, 'muslim-daily-ayah-' + key, 'ayah')
              writeSetting(DAILY_AYAH_KEY, key)
            }
          }, Math.min(delay, 2147483647)))
        }
      }

      if (enabled(APP_SETTINGS_KEYS.quranReminder)) {
        const scheduleQuranReminder = (date: Date) => {
          const target = new Date(date)
          const match = /^(\d{1,2}):(\d{2})$/.exec(readSetting(APP_SETTINGS_KEYS.quranReminderTime, '20:00'))
          if (!match) return
          target.setHours(Number(match[1]), Number(match[2]), 0, 0)
          const delay = target.getTime() - Date.now()
          if (delay > 0 && delay <= 2147483647) {
            const key = dateKey(date)
            timers.current.push(window.setTimeout(() => {
              if (getNotificationPermission() === 'granted' && enabled(APP_SETTINGS_KEYS.quranReminder) && readSetting(QURAN_REMINDER_KEY) !== key) {
                void showAppNotification('حان وقت قراءة القرآن', 'حان وقت قراءة القرآن.', 'muslim-quran-reminder-' + key, 'ayah')
                writeSetting(QURAN_REMINDER_KEY, key)
              }
            }, delay))
          }
        }
        const tomorrowForQuran = new Date(now)
        tomorrowForQuran.setDate(tomorrowForQuran.getDate() + 1)
        scheduleQuranReminder(now)
        scheduleQuranReminder(tomorrowForQuran)
      }

      const coords = readPrayerCoords()
      if (coords && (enabled(APP_SETTINGS_KEYS.azkarMorning) || enabled(APP_SETTINGS_KEYS.azkarEvening))) {
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        let todayTimings: Timings | null = null
        let tomorrowTimings: Timings | null = null
        try {
          ;[todayTimings, tomorrowTimings] = await Promise.all([
            getTimings(coords, now),
            getTimings(coords, tomorrow),
          ])
        } catch {
          return
        }
        if (cancelled || id !== runId.current) return

        const scheduleAzkar = (date: Date, timings: Timings | null) => {
          if (!timings) return
          const sunrise = parsePrayerTime(timings.Sunrise, date)
          const sunset = parsePrayerTime(timings.Sunset ?? timings.Maghrib, date)
          const items = [
            ['morning', enabled(APP_SETTINGS_KEYS.azkarMorning), sunrise, 'أذكار الصباح', 'حان وقت أذكار الصباح مع الشروق.'],
            ['evening', enabled(APP_SETTINGS_KEYS.azkarEvening), sunset, 'أذكار المساء', 'حان وقت أذكار المساء مع الغروب.'],
          ] as const
          for (const [kind, isEnabled, target, title, body] of items) {
            if (!isEnabled || !target) continue
            const delay = target.getTime() - Date.now()
            if (delay > 0 && delay <= 2147483647) {
              timers.current.push(window.setTimeout(() => {
                const key = dateKey(date) + '-' + kind
                const settingKey = kind === 'morning' ? APP_SETTINGS_KEYS.azkarMorning : APP_SETTINGS_KEYS.azkarEvening
                if (getNotificationPermission() === 'granted' && enabled(settingKey) && readSetting(AZKAR_KEY) !== key) {
                  void showAppNotification(title, body, 'muslim-azkar-' + kind + '-' + dateKey(date), 'azkar')
                  writeSetting(AZKAR_KEY, key)
                }
              }, delay))
            }
          }
        }

        scheduleAzkar(now, todayTimings)
        scheduleAzkar(tomorrow, tomorrowTimings)
      }
    }

    const refresh = () => { void schedule() }
    const interval = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('azkar-settings-changed', refresh)
    window.addEventListener('azkar-prayer-settings-changed', refresh)
    const runIdle = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(() => void schedule(), { timeout: 1800 })
      else globalThis.setTimeout(() => void schedule(), 0)
    }
    runIdle()
    return () => {
      cancelled = true
      ++runId.current
      clear()
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('azkar-settings-changed', refresh)
      window.removeEventListener('azkar-prayer-settings-changed', refresh)
    }
  }, [])
}