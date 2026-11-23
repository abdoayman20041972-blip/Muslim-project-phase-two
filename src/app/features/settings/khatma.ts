// Khatma (ختمة) progress helpers. Pure functions so the settings UI and the
// tests share exactly the same validation and math.

export const KHATMA_TOTAL_PAGES = 604

/**
 * Parse a raw input value as a khatma page number. Returns the clamped integer
 * in [0, 604], or null when the raw value is not a finite number at all
 * (empty string included — the user is still typing).
 */
export function clampKhatmaPage(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  return Math.min(KHATMA_TOTAL_PAGES, Math.max(0, Math.floor(value)))
}

/**
 * Parse a raw input value as a daily reading target in pages per day.
 * Returns the clamped integer in [1, 604], or null for empty/invalid input.
 */
export function clampKhatmaDailyTarget(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  return Math.min(KHATMA_TOTAL_PAGES, Math.max(1, Math.floor(value)))
}

export type KhatmaEstimate = {
  /** Pages left to read, 0 when the khatma is complete. */
  remaining: number
  /** Whole days needed at the daily target; 0 when nothing remains. */
  days: number
  /** Expected completion date (today + days), null when already complete. */
  finishDate: Date | null
}

/** Give the daily target a visible effect: remaining pages and the ETA. */
export function estimateKhatma(page: number, dailyTarget: number, from = new Date()): KhatmaEstimate {
  const current = Math.min(KHATMA_TOTAL_PAGES, Math.max(0, Math.floor(page)))
  const target = Math.max(1, Math.floor(dailyTarget))
  const remaining = KHATMA_TOTAL_PAGES - current
  const days = remaining === 0 ? 0 : Math.ceil(remaining / target)
  const finishDate = remaining === 0 ? null : new Date(from.getTime() + days * 86_400_000)
  return { remaining, days, finishDate }
}
