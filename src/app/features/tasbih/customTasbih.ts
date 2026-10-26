export const CUSTOM_TASBIH_KEY = 'azkar_custom_tasbih_list'

export type CustomTasbihEntry = {
  id: string
  word: string
  goal: number
  [key: string]: unknown
}

export function hasCustomTasbihList(): boolean {
  return localStorage.getItem(CUSTOM_TASBIH_KEY) !== null
}

export function getCustomTasbihList(): CustomTasbihEntry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TASBIH_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CustomTasbihEntry[]) : []
  } catch {
    return []
  }
}

export function saveCustomTasbihList(list: CustomTasbihEntry[]): void {
  localStorage.setItem(CUSTOM_TASBIH_KEY, JSON.stringify(list))
}

export function updateCustomTasbih(
  id: string,
  updates: Partial<Omit<CustomTasbihEntry, 'id'>>,
): CustomTasbihEntry[] {
  const list = getCustomTasbihList()
  const updated = list.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
  saveCustomTasbihList(updated)
  return updated
}

export function deleteCustomTasbih(id: string): CustomTasbihEntry[] {
  const list = getCustomTasbihList()
  const updated = list.filter((entry) => entry.id !== id)
  saveCustomTasbihList(updated)
  return updated
}

export function addCustomTasbih(entry: CustomTasbihEntry): CustomTasbihEntry[] {
  const list = getCustomTasbihList()
  const updated = [...list, entry]
  saveCustomTasbihList(updated)
  return updated
}
