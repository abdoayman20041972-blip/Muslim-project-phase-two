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
export const KIND = { at: 0, before: 1, morning: 2, evening: 3, ayah: 4, quran: 5, test: 6, kahf: 7 } as const
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
  /** The Friday Al-Kahf reminder stays useful until the end of Friday. */
  kahf: 12 * 60 * 60_000,
  /** The 10-second test: the user is watching the shade right now. */
  test: 0,
} as const

/** Fixed fallbacks when the sun anchors cannot be computed (no stored location). */
export const FALLBACK_MORNING_TIME = '06:00'
export const FALLBACK_EVENING_TIME = '18:00'

/** A Date on the given day at HH:MM, or null for an invalid string. */
function clockAt(date: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const at = new Date(date)
  at.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return at
}

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
  /** Optional fixed HH:MM for the morning wird; empty/undefined follows Sunrise. */
  morningTime?: string
  /** Optional fixed HH:MM for the evening wird; empty/undefined follows Sunset/Maghrib. */
  eveningTime?: string
  /** Opt-in Friday reminder to read Surat Al-Kahf (default off). */
  kahfEnabled?: boolean
  kahfTime?: string
  /** Prayers the user switched off (applies to the adhan and the pre-prayer reminder). */
  mutedPrayers?: readonly string[]
  lead: number
  channels: { adhan: string; prayer: string; reminder: string }
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, days, timingsByDay, atTimeEnabled, beforeEnabled, ayahEnabled, ayahTime, quranEnabled, quranTime, morningEnabled, eveningEnabled, lead, channels } = input
  const muted = new Set(input.mutedPrayers ?? [])
  const kahfEnabled = Boolean(input.kahfEnabled)
  const entries: PlannedNotification[] = []
  const push = (entry: Omit<PlannedNotification, 'at'> & { at: Date }) => {
    if (entry.at.getTime() <= now) return
    entries.push(entry)
  }

  days.forEach((date, dayIndex) => {
    const timings = timingsByDay[dayIndex]
    if (timings) {      PRAYERS.forEach((prayer, slot) => {
        if (muted.has(prayer)) return
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
            body: 'تبقى ' + lead + (lead <= 10 ? ' دقائق' : ' دقيقة') + ' على الأذان',
            channel: channels.prayer,
            target: 'prayer',
            group: PRAYER_GROUP,
            ttl: Math.max(TTL.before, lead * 60_000),
          })
        }
      })
    }
    const sunrise = timings ? parsePrayerTime(timings.Sunrise, date) : null
    const sunset = timings ? parsePrayerTime(timings.Sunset ?? timings.Maghrib, date) : null
    // A custom time wins over the sun anchor; with neither (no stored
    // location) the wird still fires at a fixed fallback time instead of
    // being dropped silently.
    if (morningEnabled) {
      const custom = input.morningTime ? clockAt(date, input.morningTime) : null
      const at = custom ?? sunrise ?? clockAt(date, FALLBACK_MORNING_TIME)
      if (at) {
        push({ id: makeId(KIND.morning, dayIndex, 0), at, title: 'أذكار الصباح', body: sunrise && !custom ? 'حان وقت أذكار الصباح مع الشروق.' : 'حان وقت أذكار الصباح.', channel: channels.reminder, target: 'azkar-morning', ttl: TTL.morning })
      }
    }
    if (eveningEnabled) {
      const custom = input.eveningTime ? clockAt(date, input.eveningTime) : null
      const at = custom ?? sunset ?? clockAt(date, FALLBACK_EVENING_TIME)
      if (at) {
        push({ id: makeId(KIND.evening, dayIndex, 0), at, title: 'أذكار المساء', body: sunset && !custom ? 'حان وقت أذكار المساء مع الغروب.' : 'حان وقت أذكار المساء.', channel: channels.reminder, target: 'azkar-evening', ttl: TTL.evening })
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
        push({ id: makeId(KIND.quran, dayIndex, 0), at, title: 'حان وقت قراءة القرآن', body: 'خصص وقتك اليوم لتلاوة القرآن.', channel: channels.reminder, target: 'quran', ttl: TTL.quran })
      }
    }
    if (kahfEnabled && date.getDay() === 5) {
      const match = /^(\d{1,2}):(\d{2})$/.exec(input.kahfTime ?? '') ?? /^(\d{1,2}):(\d{2})$/.exec('10:00')
      const at = new Date(date)
      at.setHours(Number(match![1]), Number(match![2]), 0, 0)
      push({ id: makeId(KIND.kahf, dayIndex, 0), at, title: 'سورة الكهف', body: 'اليوم الجمعة، لا تنسَ قراءة سورة الكهف.', channel: channels.reminder, target: 'kahf', ttl: TTL.kahf })
    }
  })
  return entries
}
