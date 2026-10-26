export type NotificationPermissionState = NotificationPermission | 'unsupported'

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.requestPermission()
}

/**
 * Best-effort browser notification delivery. Prefer the active service worker
 * when available, then fall back to the Notification constructor.
 *
 * This is intentionally provider-agnostic: reliable delivery after the app is
 * fully closed requires a Push/native provider and is not faked by timers.
 */
export async function showAppNotification(title: string, body: string, tag?: string, target?: 'prayer' | 'azkar' | 'ayah') {
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready
      if (registration.showNotification) {
        await registration.showNotification(title, {
          body,
          dir: 'rtl',
          lang: 'ar',
          icon: '/icon-192.png',
          ...(target === 'prayer' ? { vibrate: [200, 100, 200] } : {}),
          ...(tag ? { tag } : {}),
          ...(target ? { data: { url: '/?open=' + target, target } } : {}),
        })
        return true
      }
    }
  } catch {
    // Fall through to the browser Notification API.
  }

  if (getNotificationPermission() === 'granted') {
    new Notification(title, { body, dir: 'rtl', lang: 'ar', icon: '/icon-192.png', ...(tag ? { tag } : {}) })
    return true
  }
  return false
}
