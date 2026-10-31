import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ExactAlarms, type ExactAlarm } from '@muslim/exact-alarms'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { toArabicDigits } from '../../constants'
import {
  ID_BASE,
  ID_RANGE,
  planNotifications,
  PRAYER_GROUP,
  TEST_NOTIFICATION_ID,
  type PlannedNotification,
} from './notificationPlan'
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
// Accuracy design (v1.2.7 rewrite — the root-cause fixes):
//   1. Timings come from the bundled adhan astronomical calculation only —
//      never from the network — so scheduling is instant, deterministic and
//      works offline, and no slow/failed request can drop a day.
//   2. A 30-day horizon is PLANNED and stored, but only a 48-hour window is
//      ARMED with setAlarmClock at a time (~40 alarms instead of ~420):
//      the per-app alarm limit is 500, OEM battery managers flag apps that
//      register hundreds of alarm clocks as abusive, and the boot receiver
//      used to re-arm all 420 on the main thread (ANR → no notifications
//      after reboot). The native fire receiver chain-advances the window on
//      every alarm that fires, so weeks pass correctly without the app open.
//   3. TIMING goes through the custom @muslim/exact-alarms plugin:
//      AlarmManager.setAlarmClock(), the one alarm API Android never defers.
//      The stock plugin's setExactAndAllowWhileIdle was still postponed by
//      Battery Saver / OEM battery managers. Channels, permission and tap
//      actions stay with @capacitor/local-notifications.
//   4. Channels are created idempotently and NEVER deleted per run: deleting
//      a channel removes its notifications from the shade, so until v1.2.6
//      opening the app wiped the adhan notification the user was reading.
//   5. A replace run is skipped (not emptied) when prayer notifications are
//      enabled but the location is missing — a transient coord loss used to
//      cancel the whole armed prayer plan.
//   6. The intended prayer time is written into the notification body, and
//      each kind carries a TTL so stale notifications remove themselves.
//   7. Re-arms happen on app open, resume, hourly while running, settings
//      change, reboot, package replace; a manual clock/timezone change wipes
//      the plan (native) because every stored instant is absolute epoch time.

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
// again, so each adhan sound mode gets its own channel id (created once; the
// channel's sound is immutable, switching modes switches channel ids).
const adhanChannelId = (mode: AdhanSoundMode) => `muslim-adhan-v2-${mode}`
// One-time migration sweep flag. Builds ≤ v1.2.6 deleted the adhan channels on
// EVERY start (wiping the shade's notifications of that channel); this sweep
// runs once to retire the channels those builds left behind.
const CHANNELS_MIGRATED_KEY = 'muslim_channels_v4_ready'
const GOLD_LED = '#e6c86e'
/** How many days of alarms are planned and stored in one scheduling run. */
export const DAYS_AHEAD = 30
/**
 * Only the alarms inside this window are actually armed with setAlarmClock.
 * The native fire receiver re-arms the window every time an alarm fires, so
 * the horizon rolls forward without the app ever being opened.
 */
export const ARM_WINDOW_MS = 48 * 60 * 60_000
const RETRY_AFTER_FAILURE_MS = 15 * 60 * 1000

let scheduledFingerprint = ''
let lastFailureAt = 0
let inFlight: Promise<void> | null = null
let forceQueued = false

async function ensureChannels() {
  const sound = readAdhanSoundMode()
  if (!localStorage.getItem(CHANNELS_MIGRATED_KEY)) {
    // One-time: legacy v1 channel ids, plus the v2 adhan channels for the two
    // sound modes that are NOT active (the active one keeps its posted
    // notifications alive). Deleting a channel removes its shade entries.
    const retire = [...LEGACY_CHANNELS, ...(['adhan', 'default', 'silent'] as const)
      .map(adhanChannelId)
      .filter((id) => id !== adhanChannelId(sound))]
    for (const id of retire) {
      // Deleting a channel that does not exist is expected to fail on some versions.
      await LocalNotifications.deleteChannel({ id }).catch((error) => console.debug('[notifications] deleteChannel', id, error))
    }
    localStorage.setItem(CHANNELS_MIGRATED_KEY, '1')
  }
  // createChannel on an unchanged existing channel is a system no-op, so these
  // calls are safe to repeat on every scheduling run.
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
  const prayerDependent = atTimeEnabled || beforeEnabled || morningEnabled || eveningEnabled
  patchDiagnostics({ locationMissing: prayerDependent && !coords })

  // ROOT-CAUSE FIX: a replace run with prayers enabled but no location would
  // cancel the previously armed prayer plan and store a prayer-less one.
  // Skip instead — the armed alarms stay correct, the diagnostics explain why,
  // and the next trigger (resume/settings/coords arrival) retries.
  if (!coords && prayerDependent) return

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
  // armed before (the user just turned every notification off). The native
  // side stores the full 30-day plan but arms only the 48h window; the fire
  // receiver chain-advances the window as alarms fire.
  const armed = await scheduleEntries(entries)

  // Only now is the run considered successful; a failure above leaves the
  // fingerprint untouched so the next trigger retries.
  const pending = await ExactAlarms.pending().catch((error) => {
    recordError('pending', error)
    return null
  })
  if (missingDays > 0 || armed < 0) lastFailureAt = Date.now()
  else {
    lastFailureAt = 0
    scheduledFingerprint = fingerprint
  }
  patchDiagnostics({
    ranAt: new Date().toISOString(),
    scheduled: entries.length,
    armed,
    armWindowMs: ARM_WINDOW_MS,
    pending: pending ? pending.items.length : null,
    timingsMissingDays: missingDays,
  })
}

/**
 * Schedules every native notification type for the next 30 days (arming the
 * 48-hour window). Safe to call repeatedly: in-flight calls are deduplicated
 * (a force request during a run queues another run), and an unchanged state
 * is a no-op unless `force` is set. Failures are logged and stored for the
 * diagnostics card, never swallowed.
 */
export function scheduleNativeNotifications(options: { force?: boolean } = {}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  if (inFlight) {
    // Don't drop the request: run again right after the in-flight one so a
    // settings change made mid-run still lands.
    if (options.force) forceQueued = true
    return inFlight
  }
  const start = () => {
    inFlight = run(Boolean(options.force))
      .catch((error) => {
        lastFailureAt = Date.now()
        recordError('schedule', error)
      })
      .finally(() => {
        inFlight = null
        if (forceQueued) {
          forceQueued = false
          void scheduleNativeNotifications({ force: true })
        }
      })
    return inFlight
  }
  return start()
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
      ttl: entry.ttl ?? 0,
    }))
    // The pending diagnostic test survives this replace run: a resume or
    // settings change during its 10 seconds must not cancel it.
    const result = await ExactAlarms.schedule({ alarms, keepIds: [TEST_NOTIFICATION_ID], armWithinMs: ARM_WINDOW_MS })
    return result.armed
  } catch (error) {
    recordError('schedule-exact', error)
    // -1 = failed run: the fingerprint must not be saved (retry next trigger).
    return -1
  }
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
      .sort((a, b) => String(a.at).localeCompare(String(b.at)))
  } catch (error) {
    recordError('list-pending', error)
    return []
  }
}
