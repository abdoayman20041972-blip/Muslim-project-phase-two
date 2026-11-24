import { Capacitor } from '@capacitor/core'

// Notification-permission helpers for the APK build. The old web
// `notifications.ts` (Notification API + service worker) was removed with the
// rest of the web traces; inside the APK every permission question goes
// through @capacitor/local-notifications, with the browser Notification API
// kept only as a development-preview fallback.

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unknown'

/** Synchronous snapshot for initial UI state; native answers asynchronously. */
export function getNotificationPermission(): NotificationPermissionState {
  if (Capacitor.isNativePlatform()) return 'unknown'
  try {
    return (typeof Notification !== 'undefined' ? Notification.permission : 'denied') as NotificationPermissionState
  } catch {
    return 'unknown'
  }
}

/** Asks the OS; resolves after the user answers the system dialog. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const status = await LocalNotifications.checkPermissions()
      if (status.display === 'granted') return 'granted'
      const result = await LocalNotifications.requestPermissions()
      return result.display === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }
  try {
    if (typeof Notification === 'undefined') return 'denied'
    const result = await Notification.requestPermission()
    return result as NotificationPermissionState
  } catch {
    return 'denied'
  }
}

/** Re-reads the current state (use after coming back from system settings). */
export async function refreshNotificationPermission(): Promise<NotificationPermissionState> {
  if (!Capacitor.isNativePlatform()) return getNotificationPermission()
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const status = await LocalNotifications.checkPermissions()
    return (status.display ?? 'unknown') as NotificationPermissionState
  } catch {
    return 'unknown'
  }
}

/**
 * One Arabic wording for every permission state the app can see (Android
 * plugin values, the browser Notification API and the diagnostics record), so
 * the device, notification and diagnostics screens always agree.
 */
export function permissionLabel(state: string | null | undefined): string {
  switch (state) {
    case 'granted':
      return 'مسموح'
    case 'denied':
      return 'مرفوض'
    case 'prompt':
    case 'prompt-with-rationale':
    case 'default':
      return 'لم يُطلب بعد'
    case 'unavailable':
      return 'غير متاح'
    case 'unknown':
    case '':
    case null:
    case undefined:
      return 'غير معروف'
    default:
      return 'غير معروف'
  }
}
