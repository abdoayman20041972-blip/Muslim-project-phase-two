import { useEffect, useState } from 'react'
import { FONT_ORDER, FONT_SIZES, type FontSizeKey } from '../../constants'
import { QURAN_AUDIO_RECITERS } from './quranAudioPlayback'
import { APP_SETTINGS_KEYS, readSetting, writeSetting } from '../../settings'

const QURAN_PREFERENCES_EVENT = 'azkar-quran-preferences-changed'
export type QuranLayout = 'scroll' | 'pages'

export function useQuranPreferences() {
  const [fontSize, setFontSizeState] = useState<FontSizeKey>('md')
  const [reciter, setReciterState] = useState('ar.minshawi')
  const [layout, setLayoutState] = useState<QuranLayout>('scroll')

  const syncFromStorage = () => {
    try {
      const savedFont = readSetting(APP_SETTINGS_KEYS.fontSize)
      const savedReciter = readSetting(APP_SETTINGS_KEYS.reciter)
      const savedLayout = readSetting(APP_SETTINGS_KEYS.readingLayout)
      if (savedFont && FONT_ORDER.includes(savedFont as FontSizeKey)) setFontSizeState(savedFont as FontSizeKey)
      if (savedReciter && QURAN_AUDIO_RECITERS.includes(savedReciter as (typeof QURAN_AUDIO_RECITERS)[number])) setReciterState(savedReciter)
      if (savedLayout === 'pages' || savedLayout === 'scroll') setLayoutState(savedLayout)
    } catch {}
  }

  useEffect(() => {
    syncFromStorage()
    const sync = () => syncFromStorage()
    window.addEventListener(QURAN_PREFERENCES_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(QURAN_PREFERENCES_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function setFontSize(value: FontSizeKey) {
    setFontSizeState(value)
    writeSetting(APP_SETTINGS_KEYS.fontSize, value)
    window.dispatchEvent(new Event(QURAN_PREFERENCES_EVENT))
  }

  function setReciter(value: string) {
    if (!QURAN_AUDIO_RECITERS.includes(value as (typeof QURAN_AUDIO_RECITERS)[number])) return
    setReciterState(value)
    writeSetting(APP_SETTINGS_KEYS.reciter, value)
    window.dispatchEvent(new Event(QURAN_PREFERENCES_EVENT))
  }

  function setLayout(value: QuranLayout) {
    setLayoutState(value)
    writeSetting(APP_SETTINGS_KEYS.readingLayout, value)
    window.dispatchEvent(new Event(QURAN_PREFERENCES_EVENT))
  }

  return { fontSize, setFontSize, reciter, setReciter, layout, setLayout, fontConfig: FONT_SIZES[fontSize] }
}
