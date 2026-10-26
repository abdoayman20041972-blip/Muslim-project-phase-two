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
  } catch {}
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

export function itemTarget(repeat?: number): number { return Math.max(1, Number(repeat || 1)) }
export function itemCount(progress: Record<string, number>, key: string, repeat?: number): number { return Math.min(Number(progress[key] || 0), itemTarget(repeat)) }
export function completedItemCount(items: readonly { repeat?: number }[], keys: readonly string[], progress: Record<string, number>): number {
  return items.reduce((count, item, index) => count + (itemCount(progress, keys[index], item.repeat) >= itemTarget(item.repeat) ? 1 : 0), 0)
}
export function completionPercent(completed: number, total: number): number { return total ? Math.round(completed / total * 100) : 0 }

export type TimeBasedAzkar = { id: 'morning' | 'evening' | 'sleep'; title: string; subtitle: string }
export function timeBasedAzkar(date = new Date()): TimeBasedAzkar {
  const hour = date.getHours()
  if (hour >= 5 && hour < 15) return { id: 'morning', title: 'أذكار الصباح', subtitle: 'ورد الصباح الآن' }
  if (hour >= 15 && hour < 21) return { id: 'evening', title: 'أذكار المساء', subtitle: 'ورد المساء الآن' }
  return { id: 'sleep', title: 'أذكار النوم', subtitle: 'ورد النوم الآن' }
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
      try { removeStorage(LEGACY_AZKAR_PROGRESS_KEY) } catch {}
    }
    writeStorage(AZKAR_PROGRESS_MIGRATED_KEY, '1')
    return true
  } catch { return false }
}
