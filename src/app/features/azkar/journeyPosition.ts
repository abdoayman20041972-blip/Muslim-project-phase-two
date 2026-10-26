const KEY = 'azkar_journey_position'
type PositionMap = Record<string, number>

export function readJourneyPosition(categoryId: string): number | null {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}') as PositionMap
    const value = stored[categoryId]
    return typeof value === 'number' && value >= 0 ? value : null
  } catch {
    return null
  }
}

export function saveJourneyPosition(categoryId: string, index: number): void {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}') as PositionMap
    localStorage.setItem(KEY, JSON.stringify({ ...stored, [categoryId]: index }))
  } catch {}
}

export function clearJourneyPosition(categoryId: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}') as PositionMap
    const next = { ...stored }
    delete next[categoryId]
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
}
