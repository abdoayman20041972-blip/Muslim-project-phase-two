/**
 * Loaders for the bundled Quran-center datasets (built by
 * scripts/build-quran-center-data.mjs from the pinned, hash-verified
 * Quranpedia dump). All content is local: the app never calls a live API
 * for these texts.
 *
 * Heritage texts ship inside the app package. Contemporary works - when the
 * owner generated them locally - sit in the gitignored quran-center-private
 * folder and are merged in at runtime; their absence is normal, not an error.
 */

export type GharibWord = { text: string; meaning: string }
export type GharibEntry = { book: string; author: string; words: GharibWord[] }
export type GharibMap = Record<string, GharibEntry[]>
export type AsbabMap = Record<string, string>
const CENTER_BASE = '/data/quran-center'
const PRIVATE_BASE = '/data/quran-center-private'

export type SurahInfo = {
  surah: number
  type: 'مكية' | 'مدنية'
  descentOrder: number | null
  wordsCount: number | null
  introduction: string
  /** Reported virtues, present only after the scholarly review clears them. */
  grace?: string
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

function isGharibMap(value: unknown): value is GharibMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).every((entries) =>
    Array.isArray(entries) && entries.every((entry) =>
      entry && typeof entry.book === 'string' && typeof entry.author === 'string' &&
      Array.isArray(entry.words) && entry.words.every((w: unknown) =>
        !!w && typeof (w as GharibWord).text === 'string' && typeof (w as GharibWord).meaning === 'string')))
}

/** Modern (private) books first: they are the recommended primary explanations. */
export function mergeGharib(heritage: GharibMap | null, modern: GharibMap | null): GharibMap {
  const merged: GharibMap = {}
  for (const map of [modern, heritage]) {
    if (!map) continue
    for (const [ayah, entries] of Object.entries(map)) {
      ;(merged[ayah] ??= []).push(...entries)
    }
  }
  return merged
}

const gharibCache = new Map<number, Promise<GharibMap | null>>()
export function loadGharib(surah: number): Promise<GharibMap | null> {
  let cached = gharibCache.get(surah)
  if (!cached) {
    cached = Promise.all([
      fetchJson(`${CENTER_BASE}/gharib/${surah}.json`),
      fetchJson(`${PRIVATE_BASE}/gharib/${surah}.json`),
    ]).then(([heritage, modern]) => {
      const validHeritage = isGharibMap(heritage) ? heritage : null
      const validModern = isGharibMap(modern) ? modern : null
      if (!validHeritage && !validModern) return null
      return mergeGharib(validHeritage, validModern)
    })
    gharibCache.set(surah, cached)
  }
  return cached
}

const asbabCache = new Map<number, Promise<AsbabMap | null>>()
export function loadAsbab(surah: number): Promise<AsbabMap | null> {
  let cached = asbabCache.get(surah)
  if (!cached) {
    cached = fetchJson(`${CENTER_BASE}/asbab/${surah}.json`).then((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null
      const entries = Object.entries(value as Record<string, unknown>)
      if (!entries.every(([, text]) => typeof text === 'string' && text.trim())) return null
      return value as AsbabMap
    })
    asbabCache.set(surah, cached)
  }
  return cached
}

let surahInfoCache: Promise<SurahInfo[] | null> | null = null
export function loadSurahInfos(): Promise<SurahInfo[] | null> {
  if (!surahInfoCache) {
    surahInfoCache = fetchJson(`${CENTER_BASE}/surahs-info.json`).then((value) => {
      if (!Array.isArray(value) || value.length !== 114) return null
      const valid = value.every((row) =>
        row && Number.isInteger(row.surah) && (row.type === 'مكية' || row.type === 'مدنية') &&
        typeof row.introduction === 'string' &&
        (row.grace === undefined || typeof row.grace === 'string'))
      return valid ? (value as SurahInfo[]) : null
    })
  }
  return surahInfoCache
}

let centerVersionCache: Promise<string | null> | null = null
export function loadCenterVersion(): Promise<string | null> {
  if (!centerVersionCache) {
    centerVersionCache = fetchJson(`${CENTER_BASE}/version.json`).then((value) => {
      const version = (value as { dumpVersion?: unknown } | null)?.dumpVersion
      return typeof version === 'string' && version.trim() ? version : null
    })
  }
  return centerVersionCache
}

export type CenterScope = 'gharib' | 'metadata' | 'asbab' | 'virtues'
export type ScopeStatus = 'verified' | 'pending'
export type ReviewStatuses = Record<CenterScope, ScopeStatus>

/**
 * Internal review-only rendering, baked at build time. Off by default and
 * hard-disabled in production builds (import.meta.env.PROD): even if the env
 * var leaks into a production build, the bypass stays false. It lets the
 * reviewer/owner render still-pending content in dev WITH a visible review
 * banner. Nothing in the shipped configuration sets it.
 */
export const QC_REVIEW_ONLY = !import.meta.env?.PROD && import.meta.env?.VITE_QC_REVIEW_ONLY === '1'

/** A scope renders only on independent-review evidence ('verified'), or in the explicit non-production review-only mode. */
export function scopeAllowed(status: ScopeStatus): boolean {
  return status === 'verified' || QC_REVIEW_ONLY
}

const ALL_PENDING: ReviewStatuses = { gharib: 'pending', metadata: 'pending', asbab: 'pending', virtues: 'pending' }

let reviewStatusCache: Promise<ReviewStatuses> | null = null
/**
 * Runtime content gate. The 2026-11-24 upstream dump was found to misplace
 * gharib entries on wrong ayahs at scale, and grace/asbab carry ungraded
 * narrations; each scope stays locked until the independent reviewer clears it.
 * FAIL-CLOSED per scope: a missing or unreadable review-status.json (e.g. an
 * older injected pack) locks every scope. The file ships inside the data pack;
 * the corrections overlay advances a scope to 'verified' only with review evidence.
 */
export function loadReviewStatuses(): Promise<ReviewStatuses> {
  if (!reviewStatusCache) {
    reviewStatusCache = fetchJson(`${CENTER_BASE}/review-status.json`).then((value) => {
      const scopes = (value as { scopes?: Record<string, { status?: unknown }> } | null)?.scopes
      if (!scopes) return ALL_PENDING
      const read = (scope: CenterScope): ScopeStatus => scopes[scope]?.status === 'verified' ? 'verified' : 'pending'
      return { gharib: read('gharib'), metadata: read('metadata'), asbab: read('asbab'), virtues: read('virtues') }
    })
  }
  return reviewStatusCache
}

/** Test hook: drop cached fetches so a fresh stubbed fetch is consulted. */
export function resetQuranCenterCaches() {
  gharibCache.clear()
  asbabCache.clear()
  surahInfoCache = null
  centerVersionCache = null
  reviewStatusCache = null
}
