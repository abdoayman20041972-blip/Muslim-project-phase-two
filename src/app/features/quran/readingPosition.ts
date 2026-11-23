import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

// The real reading position behind "متابعة القراءة": not only which surah was
// open, but where inside it — the page in page mode, the first visible ayah in
// scroll mode. Stored as one JSON value under APP_SETTINGS_KEYS.readingPosition
// so it is backed up and mirrored like every other progress key.
export type ReadingPosition = {
  surah: number
  layout: 'scroll' | 'pages'
  /** Scroll mode: numberInSurah of the first visible ayah. */
  ayah?: number
  /** Pages mode: index within the surah's page groups. */
  pageIndex?: number
  /** Pages mode: real Medina Mushaf page number, kept for display. */
  realPage?: number
  updatedAt: number
}

export const READING_POSITION_EVENT = 'muslim-reading-position-changed'

function isValid(value: unknown): value is ReadingPosition {
  if (!value || typeof value !== 'object') return false
  const pos = value as ReadingPosition
  if (!Number.isInteger(pos.surah) || pos.surah < 1 || pos.surah > 114) return false
  if (pos.layout !== 'scroll' && pos.layout !== 'pages') return false
  if (pos.ayah !== undefined && (!Number.isInteger(pos.ayah) || pos.ayah < 1 || pos.ayah > 286)) return false
  if (pos.pageIndex !== undefined && (!Number.isInteger(pos.pageIndex) || pos.pageIndex < 0 || pos.pageIndex > 60)) return false
  if (pos.realPage !== undefined && (!Number.isInteger(pos.realPage) || pos.realPage < 1 || pos.realPage > 604)) return false
  if (pos.layout === 'scroll' && pos.ayah === undefined) return false
  if (pos.layout === 'pages' && pos.pageIndex === undefined) return false
  return true
}

export function loadReadingPosition(): ReadingPosition | null {
  try {
    const raw = readSetting(APP_SETTINGS_KEYS.readingPosition)
    if (!raw) return null
    const value = JSON.parse(raw) as unknown
    return isValid(value) ? value : null
  } catch {
    return null
  }
}

export function saveReadingPosition(pos: Omit<ReadingPosition, 'updatedAt'>): void {
  const value: ReadingPosition = { ...pos, updatedAt: Date.now() }
  if (!isValid(value)) return
  writeSetting(APP_SETTINGS_KEYS.readingPosition, JSON.stringify(value))
  try {
    window.dispatchEvent(new Event(READING_POSITION_EVENT))
  } catch {
    // A non-DOM environment (tests, SSR) still gets the stored value.
  }
}

/** Short human-facing label, e.g. "صفحة ٢٤٣" or "الآية ٥٠". */
export function readingPositionLabel(
  pos: ReadingPosition | null,
  format: (n: number) => string,
): string | null {
  if (!pos) return null
  if (pos.layout === 'pages') {
    const page = pos.realPage ?? (pos.pageIndex !== undefined ? pos.pageIndex + 1 : undefined)
    return page !== undefined ? `صفحة ${format(page)}` : null
  }
  return pos.ayah !== undefined ? `الآية ${format(pos.ayah)}` : null
}
