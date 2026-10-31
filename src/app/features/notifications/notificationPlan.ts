import { dailyAyahFor } from '../../../daily-ayahs'
import { parsePrayerTime, type Timings } from '../prayer/prayerTimes'

// Pure planning of every native notification. No Capacitor, no clock reads and
// no storage access here, so the whole schedule can be unit-tested.

export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
export const LABELS: Record<string, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
}
export const ID_BASE = 700_000_000
export const ID_RANGE = 100_000

/**
 * The 10-second diagnostic notification id lives OUTSIDE the
 * [ID_BASE, ID_BASE + ID_RANGE) window that every re-scheduling run cancels.
 * Inside it, any settings change, app resume or «جدولة الآن» tap during the
 * ten seconds would silently cancel the pending test before it ever fires —
 * exactly what users reported as "the test notification never arrived".
 */
export const TEST_NOTIFICATION_ID = ID_BASE + ID_RANGE + 1
/**
 * The group-summary notification (posted natively alongside the grouped prayer
 * notifications so the shade stacks them under one header) also lives outside
 * the cancelable window.
 */
export const GROUP_SUMMARY_NOTIFICATION_ID = ID_BASE + ID_RANGE + 2

// Deterministic ids: BASE + kind * 1000 + dayIndex * 10 + slot (no hashing, no collisions).
export const KIND = { at: 0, before: 1, morning: 2, evening: 3, ayah: 4, quran: 5, test: 6 } as const
export const makeId = (kind: number, dayIndex: number, slot: number) => ID_BASE + kind * 1000 + dayIndex * 10 + slot

/**
 * How long each notification stays useful once posted; after that Android
 * removes it from the shade by itself (NotificationCompat.setTimeoutAfter).
 * Without this a week of untapped notifications piles up in the shade —
 * especially the "prayer is coming" reminders that are stale within minutes.
 * 0 (or absent) means never auto-remove.
 */
export const TTL = {
  /** The adhan marks a prayer window; two hours later it is history. */
  at: 2 * 60 * 60_000,
  /** The pre-prayer reminder is meaningless once the adhan itself fires. */
  before: 15 * 60_000,
  morning: 4 * 60 * 60_000,
  evening: 4 * 60 * 60_000,
  /** The daily ayah can still be worth reading late in the day. */
  ayah: 10 * 60 * 60_000,
  quran: 4 * 60 * 60_000,
  /** The 10-second test: the user is watching the shade right now. */
  test: 0,
} as const

function midnightOf(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export type PlannedNotification = {
  id: number
  title: string
  body: string
  channel: string
  target: string
  at: Date
  /** Android notification group so prayers collapse into one stack. */
  group?: string
  /** Milliseconds after posting before Android auto-removes it (0 = never). */
  ttl?: number
}

/** Every prayer/adhan notification joins this group so the shade stays tidy. */
export const PRAYER_GROUP = 'muslim-prayer-times'


export type PlanInput = {
  /** Epoch milliseconds; anything at or before it is dropped. */
  now: number
  days: Date[]
  timingsByDay: Array<Timings | null>
  atTimeEnabled: boolean
  beforeEnabled: boolean
  ayahEnabled: boolean
  ayahTime: string
  quranEnabled: boolean
  quranTime: string
  morningEnabled: boolean
  eveningEnabled: boolean
  lead: number
  channels: { adhan: string; prayer: string; reminder: string }
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, days, timingsByDay, atTimeEnabled, beforeEnabled, ayahEnabled, ayahTime, quranEnabled, quranTime, morningEnabled, eveningEnabled, lead, channels } = input
  const entries: PlannedNotification[] = []
  const push = (entry: Omit<PlannedNotification, 'at'> & { at: Date }) => {
    if (entry.at.getTime() <= now) return
    entries.push(entry)
  }

  days.forEach((date, dayIndex) => {
    const timings = timingsByDay[dayIndex]
    if (timings) {      PRAYERS.forEach((prayer, slot) => {
        const time = parsePrayerTime(timings[prayer], date)
        if (!time) return
        if (atTimeEnabled) {
          push({
            id: makeId(KIND.at, dayIndex, slot),
            at: time,
            title: 'حان وقت صلاة ' + LABELS[prayer],
            body: 'حي على الصلاة، حي على الفلاح',
            channel: channels.adhan,
            target: 'prayer',
            group: PRAYER_GROUP,
            ttl: TTL.at,
          })
        }
        if (beforeEnabled) {
          push({
            id: makeId(KIND.before, dayIndex, slot),
            at: new Date(time.getTime() - lead * 60_000),
            title: 'اقترب وقت صلاة ' + LABELS[prayer],
            body: 'تبقى ' + lead + ' دقائق على الأذان',
            channel: channels.prayer,
            target: 'prayer',
            group: PRAYER_GROUP,
            ttl: TTL.before,
          })
        }
      })
      const sunrise = parsePrayerTime(timings.Sunrise, date)
      const sunset = parsePrayerTime(timings.Sunset ?? timings.Maghrib, date)
      if (morningEnabled && sunrise) {
        push({ id: makeId(KIND.morning, dayIndex, 0), at: sunrise, title: 'أذكار الصباح', body: 'حان وقت أذكار الصباح مع الشروق.', channel: channels.reminder, target: 'azkar', ttl: TTL.morning })
      }
      if (eveningEnabled && sunset) {
        push({ id: makeId(KIND.evening, dayIndex, 0), at: sunset, title: 'أذكار المساء', body: 'حان وقت أذكار المساء مع الغروب.', channel: channels.reminder, target: 'azkar', ttl: TTL.evening })
      }
    }
    if (ayahEnabled) {
      // One notification per coming date at the user's time (09:00 by default),
      // because the ayah text changes every day.
      const ayahMatch = /^(\d{1,2}):(\d{2})$/.exec(ayahTime) ?? /^(\d{1,2}):(\d{2})$/.exec('09:00')
      const at = new Date(date)
      at.setHours(Number(ayahMatch![1]), Number(ayahMatch![2]), 0, 0)
      const ayah = dailyAyahFor(midnightOf(date))
      push({ id: makeId(KIND.ayah, dayIndex, 0), at, title: 'آية اليوم', body: ayah.text + ' — ' + ayah.surah, channel: channels.reminder, target: 'ayah', ttl: TTL.ayah })
    }
    if (quranEnabled) {
      const match = /^(\d{1,2}):(\d{2})$/.exec(quranTime)
      if (match) {
        // One dated entry per day: the exact-alarm scheduler (setAlarmClock)
        // arms absolute instants only, and the daily re-arm triggers (app
        // open / resume / hourly) keep the horizon fresh anyway.
        const at = new Date(date)
        at.setHours(Number(match[1]), Number(match[2]), 0, 0)
        push({ id: makeId(KIND.quran, dayIndex, 0), at, title: 'حان وقت قراءة القرآن', body: 'خصص وقتك اليوم لتلاوة القرآن.', channel: channels.reminder, target: 'ayah', ttl: TTL.quran })
      }
    }
  })
  return entries
}
