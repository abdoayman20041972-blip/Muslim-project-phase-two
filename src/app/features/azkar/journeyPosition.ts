import { todayKey } from '../../constants'

const KEY = 'azkar_journey_position'

// Positions are stamped with the day they were saved on: a journey resumes only
// within the same day, so a new day always starts the journey fresh.
type PositionEntry = { day: string; index: number }
type PositionMap = Record<string, number | PositionEntry>

function readMap(): PositionMap {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}') as PositionMap
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch {
    return {}
  }
}

function validIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function readJourneyPosition(categoryId: string, date = new Date()): number | null {
  try {
    const stored = readMap()[categoryId]
    // Legacy bare numbers predate day stamping: keep the in-flight session once
    // and re-stamp it with today so the day rollover applies from now on.
    if (validIndex(stored)) {
      saveJourneyPosition(categoryId, stored, date)
      return stored
    }
    if (stored && typeof stored === 'object' && validIndex((stored as PositionEntry).index)) {
      const entry = stored as PositionEntry
      return entry.day === todayKey(date) ? entry.index : null
    }
    return null
  } catch {
    return null
  }
}

export function saveJourneyPosition(categoryId: string, index: number, date = new Date()): void {
  try {
    const stored = readMap()
    localStorage.setItem(KEY, JSON.stringify({ ...stored, [categoryId]: { day: todayKey(date), index } }))
  } catch (error) { console.debug('[journeyPosition]', error) }
}

export function clearJourneyPosition(categoryId: string): void {
  try {
    const stored = readMap()
    const next = { ...stored }
    delete next[categoryId]
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch (error) { console.debug('[journeyPosition]', error) }
}

export function clearAllJourneyPositions(): void {
  try {
    localStorage.removeItem(KEY)
  } catch (error) { console.debug('[journeyPosition]', error) }
}
