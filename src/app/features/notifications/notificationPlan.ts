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

// Deterministic ids: BASE + kind * 1000 + dayIndex * 10 + slot (no hashing, no collisions).
export const KIND = { at: 0, before: 1, morning: 2, evening: 3, ayah: 4, quran: 5, test: 6 } as const
export const makeId = (kind: number, dayIndex: number, slot: number) => ID_BASE + kind * 1000 + dayIndex * 10 + slot

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
  at?: Date
  daily?: { hour: number; minute: number }
  /** Android notification group so prayers collapse into one stack. */
  group?: string
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
            channel: channels.adhan,
            target: 'prayer',
            group: PRAYER_GROUP,
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
          })
        }
      })
      const sunrise = parsePrayerTime(timings.Sunrise, date)
      const sunset = parsePrayerTime(timings.Sunset ?? timings.Maghrib, date)
      if (morningEnabled && sunrise) {
        push({ id: makeId(KIND.morning, dayIndex, 0), at: sunrise, title: 'أذكار الصباح', body: 'حان وقت أذكار الصباح مع الشروق.', channel: channels.reminder, target: 'azkar' })
      }
      if (eveningEnabled && sunset) {
        push({ id: makeId(KIND.evening, dayIndex, 0), at: sunset, title: 'أذكار المساء', body: 'حان وقت أذكار المساء مع الغروب.', channel: channels.reminder, target: 'azkar' })
      }
    }
    if (ayahEnabled) {
      // One notification per coming date at the user's time (09:00 by default),
      // because the ayah text changes every day.
      const ayahMatch = /^(\d{1,2}):(\d{2})$/.exec(ayahTime) ?? /^(\d{1,2}):(\d{2})$/.exec('09:00')
      const at = new Date(date)
      at.setHours(Number(ayahMatch![1]), Number(ayahMatch![2]), 0, 0)
      const ayah = dailyAyahFor(midnightOf(date))
      push({ id: makeId(KIND.ayah, dayIndex, 0), at, title: 'آية اليوم', body: ayah.text + ' — ' + ayah.surah, channel: channels.reminder, target: 'ayah' })
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
        channel: channels.reminder,
        target: 'ayah',
        daily: { hour: Number(match[1]), minute: Number(match[2]) },
      })
    }
  }
  return entries
}
