import { registerPlugin } from '@capacitor/core'

/**
 * Schedules notifications through `AlarmManager.setAlarmClock()` natively.
 *
 * Why a custom plugin instead of @capacitor/local-notifications: the stock
 * plugin arms alarms with `setExactAndAllowWhileIdle()`, which Doze AND
 * Battery Saver may still defer — on real devices that meant the adhan and
 * even the 10-second test notification arriving late or only after opening
 * the app (see diagnostics: "test-notification-fallback"). `setAlarmClock()`
 * is documented as the one alarm the system NEVER adjusts: it treats each
 * alarm like the user's own alarm clock and leaves low-power modes to deliver
 * it on the exact minute. Channels, notification permission and tap actions
 * still go through @capacitor/local-notifications; only the TIMING lives here.
 */
const ExactAlarms = registerPlugin('ExactAlarms', {
  web: () => import('./web.js').then((m) => m.ExactAlarmsWeb),
})

export { ExactAlarms }
