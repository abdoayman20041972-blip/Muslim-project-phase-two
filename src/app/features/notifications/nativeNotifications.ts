import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { ExactAlarms, type ExactAlarm } from '@muslim/exact-alarms'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { toArabicDigits } from '../../constants'
import {
  ID_BASE,
  ID_RANGE,
  KIND,
  planNotifications,
  PRAYERS,
  TTL,
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
//      AlarmManager.setAlarmClock(), which Android documents as firing in Doze.
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
//      change, reboot, package replace. A clock change keeps the plan; a real
//      time-zone change moves fixed-local-time reminders to the same local hour
//      and flags that prayer times need a replan when the app opens.

export type AdhanSoundMode = 'adhan' | 'default' | 'silent'

export function readAdhanSoundMode(): AdhanSoundMode {
  const v = readSetting(APP_SETTINGS_KEYS.adhanSound, 'adhan')
  return v === 'default' || v === 'silent' ? v : 'adhan'
}

const KNOWN_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
/** Prayers the user switched off, stored as a comma list; unknown names are ignored. */
export function readMutedPrayers(): string[] {
  return readSetting(APP_SETTINGS_KEYS.mutedPrayers, '')
    .split(',')
    .filter((name) => KNOWN_PRAYERS.includes(name))
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
let askQueued = false

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

export type PermissionState = 'granted' | 'denied' | 'prompt'

/**
 * Reads the notification permission. The system dialog is shown ONLY when
 * `ask` is true, and `ask` is true only for an explicit user gesture (turning
 * a reminder on, the allow button, the test button, "schedule now"). Automatic
 * runs (app start, resume, hourly, settings change) never prompt, so no
 * system dialog can appear out of context.
 */
async function resolvePermission(ask: boolean): Promise<PermissionState> {
  const status = await LocalNotifications.checkPermissions()
  let display = status.display
  if (display !== 'granted' && ask) {
    const result = await LocalNotifications.requestPermissions()
    display = result.display
  }
  if (display === 'granted') return 'granted'
  return display === 'denied' ? 'denied' : 'prompt'
}

async function requestPermission(): Promise<boolean> {
  return (await resolvePermission(true)) === 'granted'
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

/**
 * Settings that change the computed prayer times or the text of the armed
 * notifications. They are part of the re-arm fingerprint so changing one of
 * them re-arms the alarms instead of being skipped as "nothing changed".
 */
export function scheduleSettingsKey(): string {
  return [
    readSetting(APP_SETTINGS_KEYS.prayerCalcMethod, ''),
    readSetting(APP_SETTINGS_KEYS.asrSchool, ''),
    readSetting(APP_SETTINGS_KEYS.timeFormat, '24'),
    readSetting(APP_SETTINGS_KEYS.numberStyle, ''),
  ].join(',')
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

/**
 * The exact-alarm scheduler replaces the whole stored plan on every run. With
 * no stored location the fresh plan has no prayer entries, so a replace would
 * silently cancel every armed prayer alarm. Instead the last location-based
 * prayer plan is cached here and its still-future entries are re-included
 * verbatim (same deterministic ids), keeping the exact same alarms armed
 * until a location is available again.
 */
const PRAYER_PLAN_CACHE_KEY = 'azkar_prayer_plan_cache_v1'

function cachePrayerEntries(entries: PlannedNotification[]) {
  // The cache mirrors the last successfully scheduled plan, never an older
  // one: it is rewritten on every successful run (with or without coords) and
  // cleared when the plan holds no prayer entries, so alarms the user turned
  // off can never be resurrected from a stale cache.
  const prayerEntries = entries.filter((entry) => entry.target === 'prayer')
  try {
    if (!prayerEntries.length) {
      localStorage.removeItem(PRAYER_PLAN_CACHE_KEY)
      return
    }
    localStorage.setItem(PRAYER_PLAN_CACHE_KEY, JSON.stringify(prayerEntries.map((entry) => ({ ...entry, at: entry.at.getTime() }))))
  } catch (error) {
    console.debug('[notifications] prayer plan cache write failed', error)
  }
}

/**
 * Reset and import can remove the stored location. The "location unavailable"
 * carry-over above is meant for a location that is only temporarily missing,
 * so after an explicit reset/import the old prayer plan (cache) and the armed
 * native alarms computed from the old location and method must not survive.
 * Replaces the native plan with an empty one (the plugin keeps only the
 * diagnostic test alarm), after waiting for any run already in flight. The
 * next run after the reload re-creates exactly what the new settings allow.
 * Returns false when the native replace failed, so the caller does not reload
 * and does not claim success.
 */
export async function dropPrayerPlanCarryover(): Promise<boolean> {
  // Wait for every run in flight. The loop re-checks because a run can start
  // while we wait; once it exits inFlight is null and, with no await before
  // the assignment below, nothing else can slip in.
  while (inFlight) await inFlight.catch(() => {})
  const work = (async () => {
    try {
      localStorage.removeItem(PRAYER_PLAN_CACHE_KEY)
    } catch (error) {
      console.debug('[notifications] prayer plan cache clear failed', error)
    }
    if (!Capacitor.isNativePlatform()) return true
    try {
      await ExactAlarms.schedule({ alarms: [], keepIds: [TEST_NOTIFICATION_ID], armWithinMs: ARM_WINDOW_MS })
      return true
    } catch (error) {
      recordError('carryover-clear', error)
      return false
    }
  })()
  // While the clear runs, scheduleNativeNotifications() joins it as the run in
  // flight (a forced request is queued), so a new run can never read the old
  // pending alarms and re-arm them after the clear. Queued work starts after.
  const guard = work.then(
    () => {},
    () => {},
  )
  inFlight = guard
  try {
    return await work
  } finally {
    if (inFlight === guard) inFlight = null
    if (forceQueued) {
      forceQueued = false
      const ask = askQueued
      askQueued = false
      void scheduleNativeNotifications({ force: true, askPermission: ask })
    }
  }
}

const prayerKindOf = (id: number) => Math.floor((id - ID_BASE) / 1000)
const prayerSlotOf = (id: number) => (id - ID_BASE) % 10
const prayerDayOf = (id: number) => Math.floor(((id - ID_BASE) % 1000) / 10)

/** Ids/at from the cache or the native pending list must pass sanity bounds. */
const isValidPrayerRef = (id: unknown, at: unknown): id is number =>
  typeof id === 'number' && Number.isInteger(id) && id >= ID_BASE && id < ID_BASE + ID_RANGE &&
  isPrayerId(id) && prayerSlotOf(id) < PRAYERS.length &&
  typeof at === 'number' && Number.isFinite(at)

/**
 * Brings carried entries in line with the CURRENT settings: the adhan channel
 * follows the current sound mode (a user who picked silent must not hear a
 * cached audible adhan), and the pre-reminder is re-derived from its adhan
 * anchor with the current lead when that anchor is recoverable. Without an
 * anchor the armed instant is kept and the body quotes no count.
 */
function normalizeCarried(entries: PlannedNotification[], lead: number, sound: AdhanSoundMode): PlannedNotification[] {
  const anchors = new Map<string, number>()
  for (const entry of entries) {
    if (prayerKindOf(entry.id) === KIND.at) anchors.set(prayerDayOf(entry.id) + ':' + prayerSlotOf(entry.id), entry.at.getTime())
  }
  return entries.map((entry) => {
    if (prayerKindOf(entry.id) === KIND.at) {
      return { ...entry, channel: adhanChannelId(sound), body: 'حي على الصلاة، حي على الفلاح' }
    }
    const anchor = anchors.get(prayerDayOf(entry.id) + ':' + prayerSlotOf(entry.id))
    if (anchor !== undefined) {
      return { ...entry, at: new Date(anchor - lead * 60_000), body: 'تبقى ' + lead + (lead <= 10 ? ' دقائق' : ' دقيقة') + ' على الأذان', ttl: Math.max(TTL.before, lead * 60_000) }
    }
    return { ...entry, body: 'استعد للصلاة.' }
  })
}
const isPrayerId = (id: number) => prayerKindOf(id) === KIND.at || prayerKindOf(id) === KIND.before

/** Rebuilds a full plan entry from a still-armed native alarm (id/at/title only). */
function reconstructPrayerEntry(item: { id: number; at: number; title: string }, lead: number, sound: AdhanSoundMode): PlannedNotification {
  const at = new Date(item.at)
  if (prayerKindOf(item.id) === KIND.before) {
    // No lead count in the body: the armed instant already carries the lead
    // it was armed with, and quoting the current lead could misdescribe it.
    return { id: item.id, at, title: item.title, body: 'استعد للصلاة.', channel: PRAYER_CHANNEL, target: 'prayer', group: PRAYER_GROUP, ttl: Math.max(TTL.before, lead * 60_000) }
  }
  return { id: item.id, at, title: item.title, body: 'حي على الصلاة، حي على الفلاح', channel: adhanChannelId(sound), target: 'prayer', group: PRAYER_GROUP, ttl: TTL.at }
}

function carriedPrayerEntries(nowMs: number, mutedPrayers: readonly string[], atTimeEnabled: boolean, beforeEnabled: boolean): PlannedNotification[] {
  try {
    const raw = localStorage.getItem(PRAYER_PLAN_CACHE_KEY)
    if (!raw) return []
    const muted = new Set(mutedPrayers)
    const parsed = JSON.parse(raw) as Array<Omit<PlannedNotification, 'at'> & { at: number }>
    return parsed
      .filter((entry) => isValidPrayerRef(entry.id, entry.at) && entry.at > nowMs)
      // Only the kinds the user still has on may come back.
      .filter((entry) => (prayerKindOf(entry.id) === KIND.at ? atTimeEnabled : beforeEnabled))
      .filter((entry) => !muted.has(PRAYERS[prayerSlotOf(entry.id)] ?? ''))
      .map((entry) => ({ ...entry, at: new Date(entry.at) }))
  } catch (error) {
    console.debug('[notifications] prayer plan cache unreadable', error)
    return []
  }
}

async function run(force: boolean, askPermission: boolean) {
  const atTimeEnabled = readSetting(APP_SETTINGS_KEYS.prayerTime, '1') === '1'
  const beforeEnabled = readSetting(APP_SETTINGS_KEYS.reminders) === '1'
  const ayahEnabled = readSetting(APP_SETTINGS_KEYS.dailyAyah, '0') === '1'
  const quranEnabled = readSetting(APP_SETTINGS_KEYS.quranReminder, '0') === '1'
  const ayahTime = readSetting(APP_SETTINGS_KEYS.dailyAyahTime, '09:00')
  const morningEnabled = readSetting(APP_SETTINGS_KEYS.azkarMorning, '0') === '1'
  const eveningEnabled = readSetting(APP_SETTINGS_KEYS.azkarEvening, '0') === '1'
  const quranTime = readSetting(APP_SETTINGS_KEYS.quranReminderTime, '20:00')
  const kahfEnabled = readSetting(APP_SETTINGS_KEYS.kahfReminder, '0') === '1'
  const kahfTime = readSetting(APP_SETTINGS_KEYS.kahfReminderTime, '10:00')
  const morningTime = readSetting(APP_SETTINGS_KEYS.azkarMorningTime, '')
  const eveningTime = readSetting(APP_SETTINGS_KEYS.azkarEveningTime, '')
  const mutedPrayers = readMutedPrayers()
  const lead = Number(readSetting(APP_SETTINGS_KEYS.prayerReminderLead, '5')) || 5
  const sound = readAdhanSoundMode()
  const coords = readPrayerCoords()
  const prayerDependent = atTimeEnabled || beforeEnabled || morningEnabled || eveningEnabled
  patchDiagnostics({ locationMissing: prayerDependent && !coords })

  // No stored location: the run continues. The pure plan gives the wirds
  // fixed fallback times and keeps the coords-free kinds (ayah, Quran,
  // Kahf); the previously armed prayer alarms are preserved below by
  // re-including the cached prayer plan (see PRAYER_PLAN_CACHE_KEY) instead
  // of silently cancelling them. The locationMissing diagnostic plus the
  // settings notice tell the user why fixed times are in effect.
  if (!coords && prayerDependent) {
    // Still record the permission state (read only, never a prompt) so the
    // diagnostics card does not show "unknown" just because the location is missing.
    await resolvePermission(false)
      .then((permission) => patchDiagnostics({ permission }))
      .catch((error) => recordError('permission-check', error))
  }

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
    morningTime,
    eveningTime,
    kahfEnabled,
    kahfTime,
    mutedPrayers.join(','),
    lead,
    sound,
    scheduleSettingsKey(),
    dateKey(now),
    now.getTimezoneOffset(),
  ].join('|')
  if (!force && fingerprint === scheduledFingerprint) return
  if (!force && lastFailureAt && Date.now() - lastFailureAt < RETRY_AFTER_FAILURE_MS) return

  const permission = await resolvePermission(askPermission)
  patchDiagnostics({ permission, exactAlarm: await checkExactAlarm() })
  if (permission !== 'granted') return
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

  const planned = withTimeInBody(
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
      morningTime,
      eveningTime,
      kahfEnabled,
      kahfTime,
      mutedPrayers,
      lead,
      channels: { adhan: adhanChannelId(sound), prayer: PRAYER_CHANNEL, reminder: REMINDER_CHANNEL },
    }),
  )
  // Location missing with prayer kinds on: re-include the still-future cached
  // prayer alarms (already enriched bodies) so the replace below keeps them armed.
  let entries = planned
  if (!coords && (atTimeEnabled || beforeEnabled)) {
    const nowMs = Date.now()
    const carried = carriedPrayerEntries(nowMs, mutedPrayers, atTimeEnabled, beforeEnabled)
    const carriedIds = new Set(carried.map((entry) => entry.id))
    // Upgrade path: the cache only exists after the first location-based run
    // of this version, so also carry still-armed native prayer alarms (the
    // 48-hour window) that the cache does not cover yet.
    const pendingNow = await ExactAlarms.pending().catch((error) => {
      recordError('pending-carry', error)
      return null
    })
    const pendingItems = pendingNow?.items ?? []
    // A successful but corrupt response is as unreadable as an error: items
    // with prayer-range ids that fail validation (bad slot, non-finite time)
    // mean armed prayers may exist that we cannot recover, so replacing the
    // plan could silently drop them. Expired-but-well-formed items are just
    // history and never trigger this.
    const corruptPrayerClaim = (item: { id?: unknown; at?: unknown }) =>
      typeof item?.id === 'number' && Number.isInteger(item.id) && item.id >= ID_BASE && item.id < ID_BASE + ID_RANGE && isPrayerId(item.id) &&
      (!(typeof item?.at === 'number' && Number.isFinite(item.at)) || prayerSlotOf(item.id) >= PRAYERS.length)
    const validPending = pendingItems.filter((item) => isValidPrayerRef(item.id, item.at) && item.at > nowMs)
    if ((pendingNow === null || (validPending.length === 0 && pendingItems.some(corruptPrayerClaim))) && carried.length === 0) {
      // Unrecoverable: no cached plan and the native armed list is unreadable,
      // so a replace could silently drop prayer alarms that are armed right
      // now. Keep the old protective skip for exactly this case — the armed
      // plan stays untouched and the next trigger retries.
      return
    }
    const mutedSet = new Set(mutedPrayers)
    const reconstructed = validPending
      .filter((item) => !carriedIds.has(item.id))
      // Only the kinds the user still has on may come back.
      .filter((item) => (prayerKindOf(item.id) === KIND.at ? atTimeEnabled : beforeEnabled))
      .filter((item) => !mutedSet.has(PRAYERS[prayerSlotOf(item.id)] ?? ''))
      .map((item) => reconstructPrayerEntry(item, lead, sound))
    const merged = normalizeCarried([...carried, ...reconstructed], lead, sound).filter((entry) => entry.at.getTime() > nowMs)
    entries = [...withTimeInBody(merged), ...planned]
  }

  await cancelLegacyStockAlarms()
  // Always a replace run — even with an empty plan it must cancel whatever was
  // armed before (the user just turned every notification off). The native
  // side stores the full 30-day plan but arms only the 48h window; the fire
  // receiver chain-advances the window as alarms fire.
  const armed = await scheduleEntries(entries)
  if (armed >= 0) cachePrayerEntries(entries)

  // Only now is the run considered successful; a failure above leaves the
  // fingerprint untouched so the next trigger retries.
  const pending = await ExactAlarms.pending().catch((error) => {
    recordError('pending', error)
    return null
  })
  if ((coords && missingDays > 0) || armed < 0) lastFailureAt = Date.now()
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
    timingsMissingDays: coords ? missingDays : 0,
  })
}

/**
 * Schedules every native notification type for the next 30 days (arming the
 * 48-hour window). Safe to call repeatedly: in-flight calls are deduplicated
 * (a force request during a run queues another run), and an unchanged state
 * is a no-op unless `force` is set. Failures are logged and stored for the
 * diagnostics card, never swallowed.
 */
export function scheduleNativeNotifications(options: { force?: boolean; askPermission?: boolean } = {}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  if (inFlight) {
    // Don't drop the request: run again right after the in-flight one so a
    // settings change made mid-run still lands.
    if (options.force) forceQueued = true
    if (options.askPermission) askQueued = true
    return inFlight
  }
  const start = () => {
    inFlight = run(Boolean(options.force), Boolean(options.askPermission))
      .catch((error) => {
        lastFailureAt = Date.now()
        recordError('schedule', error)
      })
      .finally(() => {
        inFlight = null
        if (forceQueued) {
          forceQueued = false
          const ask = askQueued
          askQueued = false
          void scheduleNativeNotifications({ force: true, askPermission: ask })
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
      wallClock: Boolean(entry.wallClock),
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
 * double-stack). setAlarmClock is documented to fire in Doze, so this should stay dormant —
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
