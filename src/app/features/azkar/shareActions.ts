import { Capacitor } from '@capacitor/core'
import { renderShareCard, shareImageBlob } from './shareCard'

// One share implementation for every azkar and hadith screen. Text is copied only through the explicit copy buttons (copyWithToast).

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

/** Brief on-screen notice at the bottom of the screen. */
export function showToast(message: string, testid = 'toast'): void {
  if (typeof document === 'undefined') return
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.setAttribute('aria-live', 'polite')
  el.dataset.testid = testid
  el.textContent = message
  el.style.cssText = 'position:fixed;left:50%;bottom:6.5rem;transform:translateX(-50%);z-index:90;width:max-content;max-width:90vw;padding:.55rem 1rem;border-radius:999px;background:#173a32;color:#fff;font-size:.75rem;font-weight:700;box-shadow:0 6px 20px rgba(0,0,0,.25);text-align:center'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2800)
}

/** Brief on-screen notice for a genuine share failure (cancelling the sheet is not a failure). */
export function showShareFailure(message = 'تعذّرت المشاركة، حاول مرة أخرى'): void {
  showToast(message, 'share-failure')
}

/** Text that goes on the clipboard: the text, then its reference on a new line when there is one. */
export function copyPayload(text: string, reference?: string): string {
  const body = text.trim()
  const ref = reference?.trim()
  return ref ? `${body}\n${ref}` : body
}

/** Copies text to the clipboard. Uses the async clipboard API and falls back to a hidden textarea with execCommand (old WebViews). Resolves false when both fail. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch (error) {
    console.debug('[copy] Clipboard API failed, trying fallback', error)
  }
  if (typeof document === 'undefined') return false
  const area = document.createElement('textarea')
  try {
    area.value = value
    area.setAttribute('readonly', '')
    area.setAttribute('aria-hidden', 'true')
    area.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, value.length)
    return typeof document.execCommand === 'function' && document.execCommand('copy') === true
  } catch (error) {
    console.debug('[copy] Fallback copy failed', error)
    return false
  } finally {
    area.remove()
  }
}

/** Copy button handler: copies text with its reference and shows "تم النسخ" or "تعذّر النسخ". */
export async function copyWithToast(text: string, reference?: string): Promise<boolean> {
  const ok = await copyText(copyPayload(text, reference))
  showToast(ok ? 'تم النسخ' : 'تعذّر النسخ', ok ? 'copy-done' : 'copy-failed')
  return ok
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
