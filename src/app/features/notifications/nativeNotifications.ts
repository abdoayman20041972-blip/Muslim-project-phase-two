import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { dailyAyahFor } from '../../../daily-ayahs'
import { patchDiagnostics, recordError } from './nativeDiagnostics'
import {
  dateKey,
  getTimings,
  parsePrayerTime,
  readPrayerCoords,
  type Timings,
} from '../prayer/prayerTimes'

// Native Android notifications with an adhan sound, covering prayer times,
// pre-prayer reminders, the daily ayah, the Quran reading reminder and the
// morning/evening azkar. All scheduling is local; no server or service worker
// is involved. Replaces the web timers (useIslamicNotifications /
// usePrayerReminders) which stop the moment the app is closed inside the APK.

export type AdhanSoundMode = 'adhan' | 'default' | 'silent'

export function readAdhanSoundMode(): AdhanSoundMode {
  const v = readSetting('adhan_sound', 'adhan')
  return v === 'default' || v === 'silent' ? v : 'adhan'
}

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
const LABELS: Record<string, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
}
const LEGACY_CHANNELS = ['muslim-adhan', 'muslim-prayer', 'muslim-reminders']
const PRAYER_CHANNEL = 'muslim-prayer-v2'
const REMINDER_CHANNEL = 'muslim-reminders-v2'
// Android keeps a deleted channel's old settings when the same id is created
// again, so each adhan sound mode gets its own channel id.
const adhanChannelId = (mode: AdhanSoundMode) => `muslim-adhan-v2-${mode}`
const ID_BASE = 700_000_000
const ID_RANGE = 100_000
const DAYS_AHEAD = 7
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000

// Deterministic ids: BASE + kind * 1000 + dayIndex * 10 + slot (no hashing, no collisions).
const KIND = { at: 0, before: 1, morning: 2, evening: 3, ayah: 4, quran: 5, test: 6 } as const
const makeId = (kind: number, dayIndex: number, slot: number) => ID_BASE + kind * 1000 + dayIndex * 10 + slot

let scheduledFingerprint = ''
let lastFailureAt = 0
let channelsReady = false
let inFlight: Promise<void> | null = null

async function ensureChannels() {
  if (!channelsReady) {
    for (const id of [...LEGACY_CHANNELS, ...(['adhan', 'default', 'silent'] as const).map(adhanChannelId)]) {
      // Deleting a channel that does not exist is expected to fail on some versions.
      await LocalNotifications.deleteChannel({ id }).catch((error) => console.debug('[notifications] deleteChannel', id, error))
    }
    channelsReady = true
  }
  const sound = readAdhanSoundMode()
  await LocalNotifications.createChannel({
    id: PRAYER_CHANNEL,
    name: 'تذكير قبل الصلاة',
    importance: 3,
    visibility: 1,
    vibration: true,
  })
  await LocalNotifications.createChannel({
    id: adhanChannelId(sound),
    name: 'الأذان',
    description: 'أذان وقت الصلاة',
    importance: sound === 'silent' ? 2 : 4,
    visibility: 1,
    ...(sound === 'adhan' ? { sound: 'adhan.mp3' } : {}),
    vibration: sound !== 'silent',
  })
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL,
    name: 'التذكيرات اليومية',
    description: 'آية اليوم وتذكير القرآن وأذكار الصباح والمساء',
    importance: 3,
    visibility: 1,
    vibration: true,
  })
}

async function requestPermission(): Promise<boolean> {
  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true
  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

/** Android 12+ exact-alarm state: 'granted' | 'denied' | 'prompt' | 'unknown'. */
export async function checkExactAlarm(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'unknown'
  try {
    const result = await LocalNotifications.checkExactNotificationSetting()
    return result.exact_alarm
  } catch (error) {
    console.debug('[notifications] exact alarm check unavailable', error)
    return 'unknown'
  }
}

/** Opens the system screen where the user can allow exact alarms. */
export async function openExactAlarmSettings(): Promise<string> {
  try {
    const result = await LocalNotifications.changeExactNotificationSetting()
    return result.exact_alarm
  } catch (error) {
    recordError('exact-alarm-settings', error)
    return 'unknown'
  }
}

async function ourPending() {
  const pending = await LocalNotifications.getPending()
  return pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + ID_RANGE)
}

async function cancelOurs() {
  const ours = await ourPending()
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })
}

function midnightOf(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

type Entry = {
  id: number
  title: string
  body: string
  channel: string
  target: string
  at?: Date
  daily?: { hour: number; minute: number }
}

async function run(force: boolean) {
  const atTimeEnabled = readSetting(APP_SETTINGS_KEYS.prayerTime, '1') === '1'
  const beforeEnabled = readSetting(APP_SETTINGS_KEYS.reminders) === '1'
  const ayahEnabled = readSetting(APP_SETTINGS_KEYS.dailyAyah, '0') === '1'
  const quranEnabled = readSetting(APP_SETTINGS_KEYS.quranReminder, '0') === '1'
  const ayahTime = readSetting(APP_SETTINGS_KEYS.dailyAyahTime, '09:00')
  const morningEnabled = readSetting(APP_SETTINGS_KEYS.azkarMorning, '0') === '1'
  const eveningEnabled = readSetting(APP_SETTINGS_KEYS.azkarEvening, '0') === '1'
  const quranTime = readSetting(APP_SETTINGS_KEYS.quranReminderTime, '20:00')
  const lead = Number(readSetting(APP_SETTINGS_KEYS.prayerReminderLead, '5')) || 5
  const sound = readAdhanSoundMode()
  const coords = readPrayerCoords()
  const needsTimings = (atTimeEnabled || beforeEnabled || morningEnabled || eveningEnabled) && !!coords

  const fingerprint = [
    coords?.lat ?? '',
    coords?.lng ?? '',
    atTimeEnabled,
    beforeEnabled,
    ayahEnabled,
    ayahTime,
    quranEnabled,
    quranTime,
    morningEnabled,
    eveningEnabled,
    lead,
    sound,
    dateKey(new Date()),
  ].join('|')
  if (!force && fingerprint === scheduledFingerprint) return
  if (!force && lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return

  const granted = await requestPermission()
  patchDiagnostics({ permission: granted ? 'granted' : 'denied', exactAlarm: await checkExactAlarm() })
  if (!granted) return
  await ensureChannels()

  const today = new Date()
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    return date
  })

  let missingDays = 0
  const timingsByDay: Array<Timings | null> = needsTimings && coords
    ? await Promise.all(
        days.map((date) =>
          getTimings(coords, date).catch((error) => {
            console.error('[notifications] getTimings failed', dateKey(date), error)
            return null
          }),
        ),
      )
    : days.map(() => null)
  if (needsTimings) missingDays = timingsByDay.filter((t) => !t).length

  const entries: Entry[] = []
  const now = Date.now()
  const push = (entry: Omit<Entry, 'at'> & { at: Date }) => {
    if (entry.at.getTime() <= now) return
    entries.push(entry)
  }

  days.forEach((date, dayIndex) => {
    const timings = timingsByDay[dayIndex]
    if (timings) {
      PRAYERS.forEach((prayer, slot) => {
        const time = parsePrayerTime(timings[prayer], date)
        if (!time) return
        if (atTimeEnabled) {
          push({
            id: makeId(KIND.at, dayIndex, slot),
            at: time,
            title: 'حان وقت صلاة ' + LABELS[prayer],
            body: 'حي على الصلاة، حي على الفلاح',
            channel: adhanChannelId(sound),
            target: 'prayer',
          })
        }
        if (beforeEnabled) {
          push({
            id: makeId(KIND.before, dayIndex, slot),
            at: new Date(time.getTime() - lead * 60_000),
            title: 'اقترب وقت صلاة ' + LABELS[prayer],
            body: 'تبقى ' + lead + ' دقائق على الأذان',
            channel: PRAYER_CHANNEL,
            target: 'prayer',
          })
        }
      })
      const sunrise = parsePrayerTime(timings.Sunrise, date)
      const sunset = parsePrayerTime(timings.Sunset ?? timings.Maghrib, date)
      if (morningEnabled && sunrise) {
        push({ id: makeId(KIND.morning, dayIndex, 0), at: sunrise, title: 'أذكار الصباح', body: 'حان وقت أذكار الصباح مع الشروق.', channel: REMINDER_CHANNEL, target: 'azkar' })
      }
      if (eveningEnabled && sunset) {
        push({ id: makeId(KIND.evening, dayIndex, 0), at: sunset, title: 'أذكار المساء', body: 'حان وقت أذكار المساء مع الغروب.', channel: REMINDER_CHANNEL, target: 'azkar' })
      }
    }
    if (ayahEnabled) {
      // One notification per coming date at the user's time (09:00 by default),
      // because the ayah text changes every day.
      const ayahMatch = /^(\d{1,2}):(\d{2})$/.exec(ayahTime) ?? /^(\d{1,2}):(\d{2})$/.exec('09:00')
      const at = new Date(date)
      at.setHours(Number(ayahMatch![1]), Number(ayahMatch![2]), 0, 0)
      const ayah = dailyAyahFor(midnightOf(date))
      push({ id: makeId(KIND.ayah, dayIndex, 0), at, title: 'آية اليوم', body: ayah.text + ' — ' + ayah.surah, channel: REMINDER_CHANNEL, target: 'ayah' })
    }
  })

  if (quranEnabled) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(quranTime)
    if (match) {
      // Fixed text, so it repeats daily on its own without the app being opened.
      entries.push({
        id: makeId(KIND.quran, 0, 0),
        title: 'حان وقت قراءة القرآن',
        body: 'خصص وقتك اليوم لتلاوة القرآن.',
        channel: REMINDER_CHANNEL,
        target: 'ayah',
        daily: { hour: Number(match[1]), minute: Number(match[2]) },
      })
    }
  }

  await cancelOurs()
  if (entries.length) {
    await LocalNotifications.schedule({
      notifications: entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        body: entry.body,
        schedule: entry.daily
          ? { on: { hour: entry.daily.hour, minute: entry.daily.minute }, allowWhileIdle: true }
          : { at: entry.at, allowWhileIdle: true },
        channelId: entry.channel,
        actionTypeId: '',
        extra: { target: entry.target },
      })),
    })
  }

  // Only now is the run considered successful; a failure above leaves the
  // fingerprint untouched so the next trigger retries.
  const pending = await ourPending().catch((error) => {
    recordError('getPending', error)
    return null
  })
  if (missingDays > 0) lastFailureAt = Date.now()
  else {
    lastFailureAt = 0
    scheduledFingerprint = fingerprint
  }
  patchDiagnostics({
    ranAt: new Date().toISOString(),
    scheduled: entries.length,
    pending: pending ? pending.length : null,
    timingsMissingDays: missingDays,
  })
}

/**
 * Schedules every native notification type for the next 7 days. Safe to call
 * repeatedly: in-flight calls are deduplicated and an unchanged state is a
 * no-op unless `force` is set. Failures are logged and stored for the
 * diagnostics card, never swallowed.
 */
export function scheduleNativeNotifications(options: { force?: boolean } = {}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  if (!inFlight) {
    inFlight = run(Boolean(options.force))
      .catch((error) => {
        lastFailureAt = Date.now()
        recordError('schedule', error)
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}

/** Fires one test notification roughly 10 seconds from now. */
export async function scheduleTestNotification(): Promise<boolean> {
  try {
    if (!(await requestPermission())) return false
    await ensureChannels()
    await LocalNotifications.schedule({
      notifications: [
        {
          id: makeId(KIND.test, 0, 0),
          title: 'إشعار تجريبي',
          body: 'إذا ظهر هذا الإشعار فالتنبيهات تعمل على جهازك.',
          schedule: { at: new Date(Date.now() + 10_000), allowWhileIdle: true },
          channelId: REMINDER_CHANNEL,
          actionTypeId: '',
          extra: { target: 'azkar' },
        },
      ],
    })
    return true
  } catch (error) {
    recordError('test-notification', error)
    return false
  }
}

export type ScheduledItem = { id: number; title: string; at: string | null }

/** What is actually pending in the OS right now (ours only), soonest first. */
export async function listScheduledNotifications(): Promise<ScheduledItem[]> {
  try {
    const items = await ourPending()
    return items
      .map((n) => ({
        id: n.id,
        title: n.title ?? '',
        at: n.schedule?.at ? new Date(n.schedule.at).toISOString() : n.schedule?.on ? 'daily' : null,
      }))
      .sort((a, b) => String(a.at).localeCompare(String(b.at)))
  } catch (error) {
    recordError('list-pending', error)
    return []
  }
}
