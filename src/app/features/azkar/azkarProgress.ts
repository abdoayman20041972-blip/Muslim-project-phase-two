import { todayKey } from '../../constants'
export type AzkarProgressDays = Record<string, Record<string, number>>

export const AZKAR_PROGRESS_KEY = 'azkar_azkar_item_progress_v2'
export const AZKAR_PROGRESS_RETENTION_DAYS = 90
export const LEGACY_AZKAR_PROGRESS_KEY = 'azkar_azkar_item_progress_v1'
export const AZKAR_PROGRESS_MIGRATED_KEY = 'azkar_azkar_item_progress_v2_migrated'

export { todayKey }

export function readAzkarProgress(date = new Date()): Record<string, number> {
  const key = todayKey(date)
  try {
    const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
    return stored.days?.[key] || {}
  } catch { return {} }
}

export function saveAzkarProgress(progress: Record<string, number>, date = new Date()): void {
  try {
    const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
    const days = { ...(stored.days || {}), [todayKey(date)]: progress }
    const recent = Object.keys(days).sort().slice(-AZKAR_PROGRESS_RETENTION_DAYS)
    const trimmed: AzkarProgressDays = {}
    recent.forEach(key => { trimmed[key] = days[key] })
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: trimmed }))
  } catch (error) { console.debug('[azkarProgress]', error) }
}

export function readAzkarProgressDays(): AzkarProgressDays {
  try {
    const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
    return stored.days && typeof stored.days === 'object' && !Array.isArray(stored.days) ? stored.days : {}
  } catch {
    return {}
  }
}

export function clearAzkarProgressDay(date = new Date()): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
    const days = { ...(stored.days || {}) }
    delete days[todayKey(date)]
    localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days }))
    return true
  } catch {
    return false
  }
}

export type ZikrKindLike = { kind?: 'zikr' | 'fadl' | 'guidance' }
// Counted dhikr only: virtue reports (fadl) and guidance cards carry no counter.
export function isCountedZikr(item: ZikrKindLike): boolean { return (item.kind ?? 'zikr') === 'zikr' }
export function countedItems<T extends ZikrKindLike>(items: readonly T[]): T[] { return items.filter(isCountedZikr) }

export function itemTarget(repeat?: number): number { return Math.max(1, Number(repeat || 1)) }
export function itemCount(progress: Record<string, number>, key: string, repeat?: number): number { return Math.min(Number(progress[key] || 0), itemTarget(repeat)) }
export function completedItemCount(items: readonly { repeat?: number }[], keys: readonly string[], progress: Record<string, number>): number {
  return items.reduce((count, item, index) => count + (itemCount(progress, keys[index], item.repeat) >= itemTarget(item.repeat) ? 1 : 0), 0)
}
export function completionPercent(completed: number, total: number): number { return total ? Math.round(completed / total * 100) : 0 }

export type TimeBasedAzkar = { id: 'morning' | 'evening' | 'sleep'; title: string; subtitle: string }
const WIRD_MORNING: TimeBasedAzkar = { id: 'morning', title: 'أذكار الصباح', subtitle: 'ورد الصباح الآن' }
const WIRD_EVENING: TimeBasedAzkar = { id: 'evening', title: 'أذكار المساء', subtitle: 'ورد المساء الآن' }
const WIRD_SLEEP: TimeBasedAzkar = { id: 'sleep', title: 'أذكار النوم', subtitle: 'ورد النوم الآن' }

export function timeBasedAzkar(date = new Date()): TimeBasedAzkar {
  const hour = date.getHours()
  if (hour >= 5 && hour < 15) return WIRD_MORNING
  if (hour >= 15 && hour < 21) return WIRD_EVENING
  return WIRD_SLEEP
}

function prayerMinutes(value: string | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '')
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

// «وردك الآن» follows the user's computed prayer times: morning from Fajr,
// evening from Asr, sleep from Isha - the same windows the fixed-hour fallback
// approximates. The anchors only pick which card the app surfaces; they are not
// a religious ruling on the valid time of each wird. Falls back to the fixed
// hours whenever timings are missing or malformed.
export function wirdForPrayerTimes(timings: Record<string, string> | null | undefined, date = new Date()): TimeBasedAzkar {
  if (!timings) return timeBasedAzkar(date)
  const fajr = prayerMinutes(timings.Fajr)
  const asr = prayerMinutes(timings.Asr)
  const isha = prayerMinutes(timings.Isha)
  if (fajr === null || asr === null || isha === null) return timeBasedAzkar(date)
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < fajr) return WIRD_SLEEP
  if (minutes < asr) return WIRD_MORNING
  if (minutes < isha) return WIRD_EVENING
  return WIRD_SLEEP
}


// Situational sections (travel, weather, sickness) are recited when the occasion happens,
// not as a daily wird, so their counters belong to the occasion and stay out of the day log.
export const AZKAR_OCCASION_KEY = 'azkar_azkar_occasion_progress_v1'
export const OCCASIONAL_CATEGORY_IDS: readonly string[] = ['travel', 'weather', 'sickness']
export function isOccasionalCategory(categoryId: string): boolean { return OCCASIONAL_CATEGORY_IDS.includes(categoryId) }

export type AzkarOccasionState = { occasion: number; counts: Record<string, number> }

function readOccasionStore(): Record<string, AzkarOccasionState> {
  try {
    const stored = JSON.parse(localStorage.getItem(AZKAR_OCCASION_KEY) || '{}') as { categories?: Record<string, AzkarOccasionState> }
    return stored.categories && typeof stored.categories === 'object' && !Array.isArray(stored.categories) ? stored.categories : {}
  } catch { return {} }
}

const AZKAR_OCCASION_MIGRATED_KEY = 'azkar_azkar_occasion_migrated_v1'

// Before the occasion store existed, situational taps were written into today's daily
// record. Move them once into the occasion store so that progress is not lost; past
// days stay untouched as history.
function migrateOccasionalProgress(): void {
  try {
    if (localStorage.getItem(AZKAR_OCCASION_MIGRATED_KEY) === '1') return
    const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
    const day = todayKey()
    const today = stored.days?.[day]
    if (today && typeof today === 'object') {
      const categories = readOccasionStore()
      let changed = false
      for (const categoryId of OCCASIONAL_CATEGORY_IDS) {
        const prefix = `${categoryId}:`
        const moved: Record<string, number> = {}
        for (const key of Object.keys(today)) {
          if (key.startsWith(prefix) && typeof today[key] === 'number') {
            moved[key] = today[key]
            delete today[key]
            changed = true
          }
        }
        if (Object.keys(moved).length > 0) {
          const entry = categories[categoryId] && typeof categories[categoryId] === 'object' && categories[categoryId].counts
            ? categories[categoryId]
            : { occasion: 1, counts: {} as Record<string, number> }
          const counts = { ...entry.counts }
          for (const [key, value] of Object.entries(moved)) counts[key] = Math.max(Number(counts[key] || 0), value)
          categories[categoryId] = { occasion: Math.max(1, Number(entry.occasion) || 1), counts }
        }
      }
      if (changed) {
        localStorage.setItem(AZKAR_PROGRESS_KEY, JSON.stringify({ ...stored, days: { ...(stored.days || {}), [day]: today } }))
        localStorage.setItem(AZKAR_OCCASION_KEY, JSON.stringify({ version: 1, categories }))
      }
    }
    localStorage.setItem(AZKAR_OCCASION_MIGRATED_KEY, '1')
  } catch (error) { console.debug('[azkarProgress]', error) }
}

export function readOccasionProgress(categoryId: string): AzkarOccasionState {
  migrateOccasionalProgress()
  const entry = readOccasionStore()[categoryId]
  if (entry && typeof entry === 'object' && entry.counts && typeof entry.counts === 'object') {
    return { occasion: Math.max(1, Number(entry.occasion) || 1), counts: entry.counts }
  }
  return { occasion: 1, counts: {} }
}

export function saveOccasionProgress(categoryId: string, state: AzkarOccasionState): void {
  try {
    const categories = { ...readOccasionStore(), [categoryId]: { occasion: Math.max(1, Number(state.occasion) || 1), counts: state.counts } }
    localStorage.setItem(AZKAR_OCCASION_KEY, JSON.stringify({ version: 1, categories }))
  } catch (error) { console.debug('[azkarProgress]', error) }
}

export function resetOccasionProgress(categoryId: string): AzkarOccasionState {
  const next = { occasion: readOccasionProgress(categoryId).occasion + 1, counts: {} as Record<string, number> }
  saveOccasionProgress(categoryId, next)
  return next
}

export function migrateLegacyProgress(
  readStorage = (key: string) => localStorage.getItem(key),
  writeStorage = (key: string, value: string) => localStorage.setItem(key, value),
  removeStorage = (key: string) => localStorage.removeItem(key),
): boolean {
  try {
    if (readStorage(AZKAR_PROGRESS_MIGRATED_KEY) === '1') return false
    const raw = readStorage(LEGACY_AZKAR_PROGRESS_KEY)
    if (raw) {
      const legacy = JSON.parse(raw)
      if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
        const stored = JSON.parse(readStorage(AZKAR_PROGRESS_KEY) || '{}') as { days?: AzkarProgressDays }
        const days = { ...(stored.days || {}), [todayKey()]: { ...legacy, ...(stored.days?.[todayKey()] || {}) } }
        const recent = Object.keys(days).sort().slice(-AZKAR_PROGRESS_RETENTION_DAYS)
        const trimmed: AzkarProgressDays = {}
        recent.forEach(key => { trimmed[key] = days[key] })
        writeStorage(AZKAR_PROGRESS_KEY, JSON.stringify({ version: 2, days: trimmed }))
      }
      try { removeStorage(LEGACY_AZKAR_PROGRESS_KEY) } catch (error) { console.debug('[azkarProgress]', error) }
    }
    writeStorage(AZKAR_PROGRESS_MIGRATED_KEY, '1')
    return true
  } catch { return false }
}
