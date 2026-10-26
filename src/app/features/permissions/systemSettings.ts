import { Capacitor } from '@capacitor/core'

// Opens Android system screens that the app cannot change itself. Loaded on
// demand so the plugin is never touched on the web.
type Target = 'app' | 'notifications' | 'battery'

export async function openSystemSettings(target: Target): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings')
    const option =
      target === 'notifications'
        ? AndroidSettings.AppNotification
        : target === 'battery'
          ? AndroidSettings.BatteryOptimization
          : AndroidSettings.ApplicationDetails
    await NativeSettings.openAndroid({ option })
    return true
  } catch (error) {
    console.error('[settings] could not open system settings', target, error)
    return false
  }
}
