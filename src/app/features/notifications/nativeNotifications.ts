import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { toArabicDigits } from '../../constants'
import { ID_BASE, ID_RANGE, planNotifications, PRAYER_GROUP, TEST_NOTIFICATION_ID, type PlannedNotification } from './notificationPlan'
import { patchDiagnostics, recordError } from './nativeDiagnostics'
import { computeTimingsLocally } from '../prayer/prayerTimings'
import {
  currentMethod,
  currentSchool,
  dateKey,
  readPrayerCoords,
  type Timings,
} from '../prayer/prayerTimes'

// Native Android notifications with an adhan sound, covering prayer times,
// pre-prayer reminders, the daily ayah, the Quran reading reminder and the
// morning/evening azkar. All scheduling is local; no server or service worker
// is involved.
//
// Accuracy design (why notifications used to arrive late or not at all):
//   1. Timings come from the bundled adhan astronomical calculation only —
//      never from the network — so scheduling is instant, deterministic and
//      works offline, and no slow/failed request can drop a day.
//   2. A 30-day horizon is scheduled at once, and the whole plan is re-armed
//      whenever the app is opened, brought back to the foreground, resumed,
//      or the day/timezone changes — so a DST shift or a missed day cannot
//      silently empty the alarm queue.
//   3. Exact alarms (SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM) are checked and
//      promoted from onboarding + settings; without them Android defers
//      alarms in Doze and "Fajr at 7 AM" happens.
//   4. The intended prayer time is written into the notification body, so
//      even a deferred notification is self-explanatory.

export type AdhanSoundMode = 'adhan' | 'default' | 'silent'

export function readAdhanSoundMode(): AdhanSoundMode {
  const v = readSetting('adhan_sound', 'adhan')
  return v === 'default' || v === 'silent' ? v : 'adhan'
}

const LEGACY_CHANNELS = ['muslim-adhan', 'muslim-prayer', 'muslim-reminders']
const PRAYER_CHANNEL = 'muslim-prayer-v2'
const REMINDER_CHANNEL = 'muslim-reminders-v2'
// The 10-second test notification gets its own HIGH-importance channel so it
// arrives as a heads-up banner WITH sound even while the app is open — a
// default-importance notification only lands silently in the shade, which is
// indistinguishable from "it never arrived" for a user watching the screen.
const TEST_CHANNEL = 'muslim-test-v1'
// Android keeps a deleted channel's old settings when the same id is created
// again, so each adhan sound mode gets its own channel id.
const adhanChannelId = (mode: AdhanSoundMode) => `muslim-adhan-v2-${mode}`
const GOLD_LED = '#e6c86e'
/** How many days of alarms are armed in one scheduling run. */
export const DAYS_AHEAD = 30
/** Scheduling is split into chunks this size to stay well inside bridge limits. */
const SCHEDULE_CHUNK = 60
const RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000

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
    description: 'تنبيه قبل دخول وقت الصلاة',
    importance: 3,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: GOLD_LED,
  })
  await LocalNotifications.createChannel({
    id: adhanChannelId(sound),
    name: 'الأذان',
    description: 'أذان وقت الصلاة',
    importance: sound === 'silent' ? 2 : 4,
    visibility: 1,
    ...(sound === 'adhan' ? { sound: 'adhan.mp3' } : {}),
    vibration: sound !== 'silent',
    ...(sound !== 'silent' ? { lights: true, lightColor: GOLD_LED } : {}),
  })
  await LocalNotifications.createChannel({
    id: REMINDER_CHANNEL,
    name: 'التذكيرات اليومية',
    description: 'آية اليوم وتذكير القرآن وأذكار الصباح والمساء',
    importance: 3,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: GOLD_LED,
  })
  await LocalNotifications.createChannel({
    id: TEST_CHANNEL,
    name: 'الإشعار التجريبي',
    description: 'اختبار أن التنبيهات تصل إلى جهازك',
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: GOLD_LED,
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

/** Every notification id this app owns EXCEPT the test one. */
export function isPlannedId(id: number): boolean {
  return id >= ID_BASE && id < ID_BASE + ID_RANGE
}

async function ourPending(options: { includeTest?: boolean } = {}) {
  const pending = await LocalNotifications.getPending()
  return pending.notifications.filter(
    (n) => isPlannedId(n.id) || (Boolean(options.includeTest) && n.id === TEST_NOTIFICATION_ID),
  )
}

async function cancelOurs() {
  const ours = await ourPending()
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })
}

/** "٤:٥٢" or "٤:٥٢ ص" following the app's clock format and digit style. */
export function timeLabel(date: Date): string {
  const use12 = readSetting(APP_SETTINGS_KEYS.timeFormat, '24') === '12'
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  if (!use12) return toArabicDigits(`${String(h).padStart(2, '0')}:${m}`)
  const suffix = h < 12 ? ' ص' : ' م'
  const hh = h % 12 || 12
  return toArabicDigits(`${String(hh).padStart(2, '0')}:${m}`) + suffix
}

/** The schedule call that actually arms alarms; chunked and fault tolerant. */
async function scheduleEntries(entries: PlannedNotification[]): Promise<number> {
  let armed = 0
  for (let offset = 0; offset < entries.length; offset += SCHEDULE_CHUNK) {
    const chunk = entries.slice(offset, offset + SCHEDULE_CHUNK)
    try {
      await LocalNotifications.schedule({
        notifications: chunk.map((entry) => ({
          id: entry.id,
          title: entry.title,
          body: entry.body,
          schedule: entry.daily
            ? { on: { hour: entry.daily.hour, minute: entry.daily.minute }, allowWhileIdle: true }
            : { at: entry.at, allowWhileIdle: true },
          channelId: entry.channel,
          actionTypeId: '',
          // Notification-shade design: a proper white status-bar silhouette and
          // the gold emblem as the large icon, with the brand gold accent —
          // instead of the squished full-colour launcher icon Android shows by default.
          smallIcon: 'muslim_stat_icon',
          largeIcon: 'muslim_large_icon',
          iconColor: GOLD_LED,
          extra: { target: entry.target, prayerAt: entry.at ? entry.at.toISOString() : null },
          ...(entry.group ? { group: entry.group, summaryText: 'مواقيت الصلاة القادمة' } : {}),
        })),
      })
      armed += chunk.length
    } catch (error) {
      recordError(`schedule-chunk-${offset}`, error)
    }
  }
  return armed
}

/**
 * Enriches the pure plan with the prayer time in the body text. A notification
 * that arrives late (battery savers can still defer delivery) then explains
 * itself instead of confusing the user.
 */
export function withTimeInBody(entries: PlannedNotification[]): PlannedNotification[] {
  return entries.map((entry) => {
    if (!entry.at) return entry
    if (entry.target !== 'prayer') {
      const label = timeLabel(entry.at)
      return entry.body.includes(label) ? entry : { ...entry, body: `${entry.body} (${label})` }
    }
    // The adhan time is the prayer time itself; the pre-reminder keeps its lead text.
    const label = timeLabel(entry.at)
    if (entry.channel.includes('adhan')) {
      return { ...entry, body: `${entry.body} · موعد الأذان ${label}` }
    }
    return { ...entry, body: `${entry.body} — موعد الأذان ${label}` }
  })
}

async function computeAllTimings(coords: { lat: number; lng: number }, days: Date[]): Promise<Array<Timings | null>> {
  const method = currentMethod()
  const school = currentSchool()
  return Promise.all(days.map((date) => computeTimingsLocally(coords, date, method, school)))
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
  const wantsPrayerTimes = atTimeEnabled || beforeEnabled || morningEnabled || eveningEnabled
  patchDiagnostics({ locationMissing: wantsPrayerTimes && !coords })

  const now = new Date()
  // The fingerprint includes the calendar day AND the timezone offset, so a
  // DST transition (Egypt switches twice a year) re-arms every alarm with the
  // new offset the next time the app is opened.
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
    dateKey(now),
    now.getTimezoneOffset(),
  ].join('|')
  if (!force && fingerprint === scheduledFingerprint) return
  if (!force && lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return

  const granted = await requestPermission()
  patchDiagnostics({ permission: granted ? 'granted' : 'denied', exactAlarm: await checkExactAlarm() })
  if (!granted) return
  await ensureChannels()

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    return date
  })

  // Local astronomical calculation only: instant, offline and deterministic.
  // A failed day is retried on the next trigger instead of blocking the rest.
  const timingsByDay: Array<Timings | null> = coords
    ? await computeAllTimings(coords, days)
    : days.map(() => null)
  const missingDays = timingsByDay.filter((t) => !t).length

  const entries = withTimeInBody(
    planNotifications({
      now: Date.now(),
      days,
      timingsByDay,
      atTimeEnabled,
      beforeEnabled,
      ayahEnabled,
      ayahTime,
      quranEnabled,
      quranTime,
      morningEnabled,
      eveningEnabled,
      lead,
      channels: { adhan: adhanChannelId(sound), prayer: PRAYER_CHANNEL, reminder: REMINDER_CHANNEL },
    }),
  )

  await cancelOurs()
  const armed = entries.length ? await scheduleEntries(entries) : 0

  // Only now is the run considered successful; a failure above leaves the
  // fingerprint untouched so the next trigger retries.
  const pending = await ourPending().catch((error) => {
    recordError('getPending', error)
    return null
  })
  if (missingDays > 0 || armed < entries.length) lastFailureAt = Date.now()
  else {
    lastFailureAt = 0
    scheduledFingerprint = fingerprint
  }
  patchDiagnostics({
    ranAt: new Date().toISOString(),
    scheduled: entries.length,
    armed,
    pending: pending ? pending.length : null,
    timingsMissingDays: missingDays,
  })
}

/**
 * Schedules every native notification type for the next 30 days. Safe to call
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
let testFallbackTimer = 0

function testNotification(at: Date, title = 'إشعار تجريبي', body = 'إذا ظهر هذا الإشعار فالتنبيهات تعمل على جهازك.') {
  return {
    // Deliberately OUTSIDE the [ID_BASE, ID_BASE + ID_RANGE) window that
    // every re-scheduling run cancels: a resume, a settings change or
    // «جدولة الآن» during the 10 seconds must NOT kill the pending test.
    id: TEST_NOTIFICATION_ID,
    title,
    body,
    schedule: { at, allowWhileIdle: true },
    channelId: TEST_CHANNEL,
    actionTypeId: '',
    smallIcon: 'muslim_stat_icon',
    largeIcon: 'muslim_large_icon',
    iconColor: GOLD_LED,
    extra: { target: 'azkar' },
  }
}

/**
 * Foreground safety net: if the native alarm has not DELIVERED the test
 * notification 12 seconds after scheduling (checked against the real shade
 * state via getDeliveredNotifications), post it right away with the same id
 * (posting the same id replaces, so it can never double-stack). Covers OEM
 * alarm deferral and broken alarm paths while the user is still watching the
 * app; the background case keeps being handled by the native alarm itself.
 */
function armTestFallback() {
  if (testFallbackTimer) window.clearTimeout(testFallbackTimer)
  testFallbackTimer = window.setTimeout(() => {
    testFallbackTimer = 0
    if (document.visibilityState !== 'visible') return
    void (async () => {
      try {
        const delivered = await LocalNotifications.getDeliveredNotifications()
        if (delivered.notifications.some((n) => n.id === TEST_NOTIFICATION_ID)) return
        await LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIFICATION_ID }] }).catch(() => {})
        await LocalNotifications.schedule({ notifications: [testNotification(new Date(Date.now() + 800))] })
        patchDiagnostics({ testFallbackUsed: true })
        recordError(
          'test-notification-fallback',
          new Error('لم يسلّم المنبّه الأصلي خلال ١٢ ثانية وتمّت التسليم عبر المسار الاحتياطي'),
        )
      } catch (error) {
        recordError('test-notification-fallback', error)
      }
    })()
  }, 12_000)
}

export async function scheduleTestNotification(): Promise<boolean> {
  try {
    if (!(await requestPermission())) return false
    await ensureChannels()
    // A previous test may still be pending (double tap): replace it cleanly
    // instead of stacking a second one.
    await LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIFICATION_ID }] }).catch(() => {})
    await LocalNotifications.schedule({
      notifications: [testNotification(new Date(Date.now() + 10_000))],
    })
    const pendingNow = await ourPending({ includeTest: true }).catch(() => null)
    const confirmed = pendingNow ? pendingNow.some((n) => n.id === TEST_NOTIFICATION_ID) : null
    armTestFallback()
    patchDiagnostics({ testScheduledAt: new Date().toISOString(), testFallbackUsed: false })
    // A failed confirmation (null) is unknown, not false: the schedule call
    // itself succeeded, so the button reports success while diagnostics show
    // whether the OS really lists the notification as pending.
    return confirmed !== false
  } catch (error) {
    recordError('test-notification', error)
    return false
  }
}

export type ScheduledItem = { id: number; title: string; at: string | null }

/** What is actually pending in the OS right now (ours, incl. the test), soonest first. */
export async function listScheduledNotifications(): Promise<ScheduledItem[]> {
  try {
    const items = await ourPending({ includeTest: true })
    return items
      .map((n) => ({
        id: n.id,
        title: n.title ?? '',
        at: n.schedule?.at ? new Date(n.schedule.at).toISOString() : n.schedule?.on ? 'daily' : null,
      }))
      .sort((a, b) => String(a.at).localeCompare(String(a.at)))
  } catch (error) {
    recordError('list-pending', error)
    return []
  }
}
