export type RadioStation = { id: number; name: string; url: string }
export type RadioGroup = 'all' | 'reciters' | 'learn'

export const RADIO_API_URL = 'https://www.mp3quran.net/api/v3/radios?language=ar'
const CACHE_KEY = 'azkar_radio_stations_v1'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// Stations pinned at the top of "all": the general mix, then well known reciters.
export const FEATURED_RADIO_IDS = [108, 79, 32, 74, 69, 63, 17, 33, 58, 123]
// Pinned spoken stations on "all", so they are visible without opening the chip.
export const FEATURED_LEARN_IDS = [21114, 10903, 109083, 109069, 10904, 109067, 109073]
// Seerah, companions, tafsir, fatwa and similar spoken stations.
export const LEARN_RADIO_IDS = [21114, 21115, 10903, 10904, 21117, 116, 109083, 109069, 109073, 113, 109066, 109067, 109076, 10906, 10907]

export function cleanStationName(raw: string) {
  return raw.replace(/\*+/g, '').replace(/[\s-]+$/g, '').replace(/^[\s-]+/g, '').replace(/\s+/g, ' ').trim()
}

export function stationGroup(station: RadioStation): Exclude<RadioGroup, 'all'> {
  return LEARN_RADIO_IDS.includes(station.id) ? 'learn' : 'reciters'
}

export function normalizeStations(payload: unknown): RadioStation[] {
  const list = (payload as { radios?: unknown })?.radios
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: RadioStation[] = []
  for (const item of list) {
    const row = item as { id?: unknown; name?: unknown; url?: unknown }
    if (typeof row.id !== 'number' || typeof row.name !== 'string' || typeof row.url !== 'string') continue
    if (!/^https:\/\//.test(row.url)) continue
    const name = cleanStationName(row.name)
    // Translations of the meanings are not part of this section.
    if (!name || name.startsWith('ترجمة')) continue
    if (seen.has(row.url)) continue
    seen.add(row.url)
    out.push({ id: row.id, name, url: row.url })
  }
  return out
}

export function readCachedStations(now = Date.now()): { stations: RadioStation[]; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number; stations?: RadioStation[] }
    if (!parsed.stations?.length || typeof parsed.at !== 'number') return null
    return { stations: parsed.stations, fresh: now - parsed.at < CACHE_MAX_AGE_MS }
  } catch { return null }
}

export async function loadStations(fetcher: typeof fetch = fetch): Promise<{ stations: RadioStation[]; offlineCopy: boolean }> {
  const cached = readCachedStations()
  if (cached?.fresh) return { stations: cached.stations, offlineCopy: false }
  try {
    const response = await fetcher(RADIO_API_URL)
    if (!response.ok) throw new Error(String(response.status))
    const stations = normalizeStations(await response.json())
    if (!stations.length) throw new Error('empty')
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), stations })) } catch { /* Cache is optional. */ }
    return { stations, offlineCopy: false }
  } catch (error) {
    if (cached) return { stations: cached.stations, offlineCopy: true }
    throw error
  }
}

export function orderedStations(stations: RadioStation[], group: RadioGroup, query: string): { featured: RadioStation[]; learn: RadioStation[]; rest: RadioStation[] } {
  const q = query.trim()
  const inGroup = (s: RadioStation) => group === 'all' || stationGroup(s) === group
  const matches = (s: RadioStation) => !q || s.name.includes(q)
  const visible = stations.filter((s) => inGroup(s) && matches(s))
  if (q || group !== 'all') return { featured: [], learn: [], rest: visible }
  const pick = (ids: number[]) => ids.map((id) => visible.find((s) => s.id === id)).filter((s): s is RadioStation => !!s)
  const featured = pick(FEATURED_RADIO_IDS)
  const learn = pick(FEATURED_LEARN_IDS)
  const pinned = new Set([...featured, ...learn].map((s) => s.id))
  return { featured, learn, rest: visible.filter((s) => !pinned.has(s.id)) }
}
