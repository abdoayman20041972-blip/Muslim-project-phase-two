import { Capacitor } from '@capacitor/core'
import { renderShareCard, shareImageBlob } from './shareCard'

// One share implementation for every azkar and hadith screen. There is no text copy in the app.

/** Opens the native share sheet (APK), the Web Share API, . */
export async function shareText(text: string, options: { title?: string; source?: string } = {}): Promise<void> {
  const value = options.source ? `${text}\n\n${options.source}` : text
  try {
    if (Capacitor.isNativePlatform()) {
      // Inside the APK navigator.share does not exist; use the native sheet.
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: options.title, text: value, dialogTitle: 'مشاركة الذكر' })
    } else if (navigator.share) {
      await navigator.share({ title: options.title, text: value })
    }
  } catch (error) {
    // The user dismissing the sheet is normal; there is no error UI to show.
    console.debug('[share] Share cancelled or unavailable', error)
  }
}

/** Brief on-screen notice for a genuine share failure (cancelling the sheet is not a failure). */
export function showShareFailure(message = 'تعذّرت المشاركة، حاول مرة أخرى'): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.dataset.testid = 'share-failure'
  el.textContent = message
  el.style.cssText = 'position:fixed;left:50%;bottom:6.5rem;transform:translateX(-50%);z-index:90;width:max-content;max-width:90vw;padding:.55rem 1rem;border-radius:999px;background:#173a32;color:#fff;font-size:.75rem;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2800)
}

/** Shares a quote (dhikr, hadith) as a green card image. Never falls back to text: where the share sheet cannot take images (desktop browser) the card PNG is downloaded instead. Resolves false only when the card could not be made or shared at all. */
export async function shareQuoteCard(input: { text: string; reference?: string; heading: string; filename: string }): Promise<boolean> {
  try {
    const blob = await renderShareCard({ text: input.text, reference: input.reference, heading: input.heading, footer: 'مسلم', filename: input.filename })
    if (!blob) { showShareFailure(); return false }
    if (await shareImageBlob(blob, input.filename, input.heading)) return true
    if (Capacitor.isNativePlatform()) { showShareFailure(); return false }
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = input.filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.debug('[share] Card share failed', error)
    showShareFailure()
    return false
  }
}
