import { registerPlugin } from '@capacitor/core'

/**
 * Schedules notifications through `AlarmManager.setAlarmClock()` natively.
 *
 * Why a custom plugin instead of @capacitor/local-notifications: the stock
 * plugin arms alarms with `setExactAndAllowWhileIdle()`. Android documents
 * that setAlarmClock alarms keep firing in Doze, and that revoking the
 * exact-alarm permission removes them. Vendor battery managers are outside
 * that documentation, so the plugin also keeps a native fire log. Channels,
 * notification permission and tap actions still go through
 * @capacitor/local-notifications; only the TIMING lives here.
 */
const ExactAlarms = registerPlugin('ExactAlarms', {
  web: () => import('./web.js').then((m) => m.ExactAlarmsWeb),
})

export { ExactAlarms }
