import { useCallback, useSyncExternalStore } from 'react'
import { FONT_ORDER, FONT_SIZES, type FontSizeKey } from '../../constants'
import { QURAN_AUDIO_RECITERS } from './quranAudioPlayback'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

export type QuranLayout = 'scroll' | 'pages'
type QuranPreferences = { fontSize: FontSizeKey; reciter: string; layout: QuranLayout }

const DEFAULTS: QuranPreferences = { fontSize: 'md', reciter: 'ar.minshawi', layout: 'scroll' }
const PREFERENCE_KEYS = [APP_SETTINGS_KEYS.fontSize, APP_SETTINGS_KEYS.reciter, APP_SETTINGS_KEYS.readingLayout]

// One shared in-memory copy for the whole app. Before phase six every hook
// instance kept its own useState copy and hoped the custom event reached the
// others; now localStorage is read once into this module cache, every write
// goes through updateQuranPreferences, and all consumers subscribe here.
let cache: QuranPreferences | null = null
const listeners = new Set<() => void>()

function readStored(): QuranPreferences {
  const next = { ...DEFAULTS }
  try {
    const savedFont = readSetting(APP_SETTINGS_KEYS.fontSize)
    const savedReciter = readSetting(APP_SETTINGS_KEYS.reciter)
    const savedLayout = readSetting(APP_SETTINGS_KEYS.readingLayout)
    if (FONT_ORDER.includes(savedFont as FontSizeKey)) next.fontSize = savedFont as FontSizeKey
    if (QURAN_AUDIO_RECITERS.includes(savedReciter as (typeof QURAN_AUDIO_RECITERS)[number])) next.reciter = savedReciter
    if (savedLayout === 'pages' || savedLayout === 'scroll') next.layout = savedLayout
  } catch (error) {
    console.debug('[useQuranPreferences]', error)
  }
  return next
}

function getSnapshot(): QuranPreferences {
  return (cache ??= readStored())
}

// SSR: there is no storage on the server, so the server render uses the
// defaults; React patches to the stored client snapshot right after
// hydration. Without this third argument useSyncExternalStore aborts
// server rendering ("Missing getServerSnapshot", React error #419).
const getServerSnapshot = (): QuranPreferences => DEFAULTS

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  // A fresh mount must pick up values written directly to storage since this
  // module's cache was initialized (backup import, native mirror restore, or
  // plain localStorage writes), the same way the old per-instance state did.
  const fresh = readStored()
  const current = getSnapshot()
  if (fresh.fontSize !== current.fontSize || fresh.reciter !== current.reciter || fresh.layout !== current.layout) {
    cache = fresh
    queueMicrotask(emit)
  }
  // Cross-tab/window sync: another context wrote to localStorage directly.
  const onStorage = (event: StorageEvent) => {
    if (event.key && !PREFERENCE_KEYS.includes(event.key as (typeof PREFERENCE_KEYS)[number])) return
    const stored = readStored()
    const latest = getSnapshot()
    if (stored.fontSize === latest.fontSize && stored.reciter === latest.reciter && stored.layout === latest.layout) return
    cache = stored
    emit()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function updateQuranPreferences(partial: Partial<QuranPreferences>): void {
  const current = getSnapshot()
  const next = { ...current, ...partial }
  if (next.fontSize === current.fontSize && next.reciter === current.reciter && next.layout === current.layout) return
  cache = next
  if (next.fontSize !== current.fontSize) writeSetting(APP_SETTINGS_KEYS.fontSize, next.fontSize)
  if (next.reciter !== current.reciter) writeSetting(APP_SETTINGS_KEYS.reciter, next.reciter)
  if (next.layout !== current.layout) writeSetting(APP_SETTINGS_KEYS.readingLayout, next.layout)
  emit()
}

// Test-only: test files share the module cache between cases; drop it when a
// test needs the stored values re-read.
export function __resetQuranPreferencesForTests(): void {
  cache = null
}

export function useQuranPreferences() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setFontSize = useCallback((value: FontSizeKey) => {
    if (!FONT_ORDER.includes(value)) return
    updateQuranPreferences({ fontSize: value })
  }, [])

  const setReciter = useCallback((value: string) => {
    if (!QURAN_AUDIO_RECITERS.includes(value as (typeof QURAN_AUDIO_RECITERS)[number])) return
    updateQuranPreferences({ reciter: value })
  }, [])

  const setLayout = useCallback((value: QuranLayout) => {
    if (value !== 'pages' && value !== 'scroll') return
    updateQuranPreferences({ layout: value })
  }, [])

  return { fontSize: state.fontSize, setFontSize, reciter: state.reciter, setReciter, layout: state.layout, setLayout, fontConfig: FONT_SIZES[state.fontSize] }
}
