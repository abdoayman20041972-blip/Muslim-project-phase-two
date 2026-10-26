import { Capacitor } from '@capacitor/core'

// One copy/share implementation for every azkar screen.

/** Copies text, falling back to a hidden textarea where the Clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.debug('[share] Clipboard API unavailable, using the textarea fallback', error)
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch (error) {
    console.error('[share] Copy failed', error)
    return false
  }
}

/** Opens the native share sheet (APK), the Web Share API, or copies as a last resort. */
export async function shareText(text: string, options: { title?: string; source?: string } = {}): Promise<void> {
  const value = options.source ? `${text}\n\n${options.source}` : text
  try {
    if (Capacitor.isNativePlatform()) {
      // Inside the APK navigator.share does not exist; use the native sheet.
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: options.title, text: value, dialogTitle: 'مشاركة الذكر' })
    } else if (navigator.share) {
      await navigator.share({ title: options.title, text: value })
    } else {
      await copyText(value)
    }
  } catch (error) {
    // The user dismissing the sheet is normal; there is no error UI to show.
    console.debug('[share] Share cancelled or unavailable', error)
  }
}
