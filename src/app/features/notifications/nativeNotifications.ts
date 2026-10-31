import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ExactAlarms, type ExactAlarm } from '@muslim/exact-alarms'
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
//   3. TIMING goes through the custom @muslim/exact-alarms plugin:
//      AlarmManager.setAlarmClock(), the one alarm API Android never defers
//      ("the system identifies these alarms as the most critical ones and
//      leaves low-power modes if necessary to deliver the alarms"). The stock
//      plugin's setExactAndAllowWhileIdle was still postponed by Battery
//      Saver / OEM battery managers — the root cause of "notifications arrive
//      but never on time". Channels, permission and tap actions stay with
//      @capacitor/local-notifications.
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
    // Prefer the exact-alarms plugin's own view of the special access; the
    // stock plugin stays as a fallback for unexpected bridge failures.
    const result = await ExactAlarms.check()
    return result.exactAlarm
  } catch {
    try {
      const result = await LocalNotifications.checkExactNotificationSetting()
      return result.exact_alarm
    } catch (error) {
      console.debug('[notifications] exact alarm check unavailable', error)
      return 'unknown'
    }
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

async function cancelLegacyStockAlarms() {
  // Migration sweep: builds before the exact-alarms plugin scheduled through
  // @capacitor/local-notifications; any of its alarms still pending in the OS
  // would double-fire, so they are cancelled once and forgotten.
  try {
    const pending = await LocalNotifications.getPending()
    const stale = pending.notifications.filter((n) => isPlannedId(n.id) || n.id === TEST_NOTIFICATION_ID)
    if (stale.length) {
      await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) })
    }
  } catch (error) {
    recordError('legacy-cancel', error)
  }
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

/** The schedule call that actually arms alarms; fault tolerant. */
async function scheduleEntries(entries: PlannedNotification[]): Promise<number> {
  try {
    const alarms: ExactAlarm[] = entries.map((entry) => ({
      id: entry.id,
      at: entry.at.getTime(),
      title: entry.title,
      body: entry.body,
      channel: entry.channel,
      target: entry.target,
      group: entry.group ?? null,
    }))
    // The pending diagnostic test survives this replace run: a resume or
    // settings change during its 10 seconds must not cancel it.
    const result = await ExactAlarms.schedule({ alarms, keepIds: [TEST_NOTIFICATION_ID] })
    return result.armed
  } catch (error) {
    recordError('schedule-exact', error)
    return 0
  }
}

/**
 * Enriches the pure plan with the prayer time in the body text. A notification
 * that arrives late (battery savers can still defer delivery) then explains
 * itself instead of confusing the user.
 */
export function withTimeInBody(entries: PlannedNotification[]): PlannedNotification[] {
  return entries.map((entry) => {
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

  await cancelLegacyStockAlarms()
  // Always a replace run — even with an empty plan it must cancel whatever was
  // armed before (the user just turned every notification off).
  const armed = await scheduleEntries(entries)

  // Only now is the run considered successful; a failure above leaves the
  // fingerprint untouched so the next trigger retries.
  const pending = await ExactAlarms.pending().catch((error) => {
    recordError('pending', error)
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
    pending: pending ? pending.items.length : null,
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

/**
 * Foreground safety net: if the native setAlarmClock alarm has not DELIVERED
 * the test notification 12 seconds after scheduling (checked against the real
 * shade state), post it right away through @capacitor/local-notifications
 * with the same id (posting the same id replaces, so it can never
 * double-stack). setAlarmClock is never deferred, so this should stay dormant —
 * it only covers a broken vendor alarm path while the user is watching.
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
        await ExactAlarms.cancelOne({ id: TEST_NOTIFICATION_ID }).catch(() => {})
        await LocalNotifications.schedule({
          notifications: [
            {
              id: TEST_NOTIFICATION_ID,
              title: 'إشعار تجريبي',
              body: 'إذا ظهر هذا الإشعار فالتنبيهات تعمل على جهازك.',
              schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true },
              channelId: TEST_CHANNEL,
              actionTypeId: '',
              smallIcon: 'muslim_stat_icon',
              largeIcon: 'muslim_large_icon',
              iconColor: GOLD_LED,
              extra: { target: 'azkar' },
            },
          ],
        })
        patchDiagnostics({ testFallbackUsed: true })
        recordError(
          'test-notification-fallback',
          new Error('لم يسلّم منبّه setAlarmClock خلال ١٢ ثانية وتمّت التسليم عبر المسار الاحتياطي'),
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
    // instead of stacking a second one — without touching the 30-day plan.
    await ExactAlarms.cancelOne({ id: TEST_NOTIFICATION_ID }).catch(() => {})
    await LocalNotifications.cancel({ notifications: [{ id: TEST_NOTIFICATION_ID }] }).catch(() => {})
    const scheduledAt = new Date(Date.now() + 10_000)
    const result = await ExactAlarms.add({
      alarm: {
        id: TEST_NOTIFICATION_ID,
        at: scheduledAt.getTime(),
        title: 'إشعار تجريبي',
        body: 'إذا ظهر هذا الإشعار فالتنبيهات تعمل على جهازك.',
        channel: TEST_CHANNEL,
        target: 'azkar',
        group: null,
      },
    })
    const confirmed = result.armed > 0
    armTestFallback()
    patchDiagnostics({ testScheduledAt: new Date().toISOString(), testFallbackUsed: false })
    // A failed confirmation is reported honestly: with setAlarmClock the
    // arm call either worked or the diagnostics show exactly why not.
    return confirmed
  } catch (error) {
    recordError('test-notification', error)
    return false
  }
}

export type ScheduledItem = { id: number; title: string; at: string | null }

/** What is actually pending in the OS right now (ours, incl. the test), soonest first. */
export async function listScheduledNotifications(): Promise<ScheduledItem[]> {
  try {
    const pending = await ExactAlarms.pending()
    return pending.items
      .map((item) => ({
        id: item.id,
        title: item.title ?? '',
        at: item.at ? new Date(item.at).toISOString() : null,
      }))
      .sort((a, b) => String(a.at).localeCompare(String(a.at)))
  } catch (error) {
    recordError('list-pending', error)
    return []
  }
}
