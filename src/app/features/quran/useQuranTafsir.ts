import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ayah } from '../../constants'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { fetchWithTimeout } from '../../net'

const sources = {
  muyassar: { id: 'muyassar', label: 'التفسير الميسر' },
  saddi: { id: 'al-saddi', label: 'تفسير السعدي' },
  ibnKathir: { id: 'ibn-kathir', label: 'تفسير ابن كثير' },
  tabari: { id: 'al-tabari', label: 'تفسير الطبري' },
} as const
function currentSource() {
  const value = readSetting(APP_SETTINGS_KEYS.tafsirSource, 'muyassar')
  return Object.hasOwn(sources, value) ? value as keyof typeof sources : 'muyassar'
}
type Selection = { ayah: Ayah; surah: number; source: keyof typeof sources; serial: number }
type Result = { serial: number; text: string | null; error: boolean; loading: boolean }

/** Every visible result belongs to one source/surah/ayah selection, never a previous request. */
export function useQuranTafsir(surah: number) {
  const [source, setSource] = useState(currentSource)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const serial = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const closeTafsir = useCallback(() => {
    serial.current += 1
    controller.current?.abort()
    setSelection(null)
    setResult(null)
  }, [])
  useEffect(() => {
    const changed = () => { setSource(currentSource()); closeTafsir() }
    const storage = (event: StorageEvent) => {
      if (event.key === APP_SETTINGS_KEYS.tafsirSource || event.key === null) changed()
    }
    window.addEventListener('azkar-settings-changed', changed)
    window.addEventListener('storage', storage)
    return () => {
      window.removeEventListener('azkar-settings-changed', changed)
      window.removeEventListener('storage', storage)
    }
  }, [closeTafsir])
  useEffect(() => { closeTafsir() }, [surah, closeTafsir])
  const openTafsir = useCallback((ayah: Ayah) => {
    controller.current?.abort()
    const nextSource = currentSource()
    setSource(nextSource)
    setResult(null)
    setSelection({ ayah, surah, source: nextSource, serial: ++serial.current })
  }, [surah])
  useEffect(() => {
    if (!selection || selection.surah !== surah || selection.source !== source) return
    const request = new AbortController()
    controller.current = request
    const active = () => !request.signal.aborted && serial.current === selection.serial
      && currentSource() === selection.source
    const publish = (text: string | null, error = false) => {
      if (active()) setResult({ serial: selection.serial, text, error, loading: false })
    }
    const key = `azkar_tafsir_${sources[selection.source].id}_${selection.surah}:${selection.ayah.numberInSurah}`
    const cache = (text: string) => {
      if (!active()) return
      try {
        const entries = Object.keys(localStorage).filter(k => k.startsWith('azkar_tafsir_'))
        while (entries.length >= 80) localStorage.removeItem(entries.shift()!)
        localStorage.setItem(key, text)
      } catch { /* A full or unavailable cache must not hide a valid response. */ }
    }
    const load = async () => {
      const cached = readSetting(key)
      if (cached.trim()) { publish(cached); return }
      if (active()) setResult({ serial: selection.serial, text: null, error: false, loading: true })
      if (selection.source === 'muyassar') {
        try {
          const response = await fetch(`/data/tafsir/muyassar/${selection.surah}.json`, { signal: request.signal })
          if (!active()) return
          if (response.ok) {
            const json = await response.json()
            if (!active()) return
            const text = json?.[String(selection.ayah.numberInSurah)]
            if (typeof text === 'string' && text.trim()) { cache(text); publish(text); return }
          }
        } catch { if (!active()) return }
      }
      if (!active()) return
      try {
        const url = `https://alfurqan.online/api/v1/tafseer/${sources[selection.source].id}/surah/${selection.surah}/ayah/${selection.ayah.numberInSurah}`
        const response = await fetchWithTimeout(url, 10_000, { signal: request.signal })
        if (!active()) return
        if (!response.ok) throw new Error('tafsir')
        const json = await response.json()
        if (!active()) return
        const text = json?.ayah?.text
        if (typeof text !== 'string' || !text.trim()) throw new Error('tafsir')
        // Some providers omit identity fields. When present they must match.
        if ((json.surah?.number != null && Number(json.surah.number) !== selection.surah)
          || (json.ayah?.ayah != null && Number(json.ayah.ayah) !== selection.ayah.numberInSurah)) throw new Error('tafsir identity')
        cache(text)
        publish(text)
      } catch { publish(null, true) }
    }
    void load()
    return () => { request.abort(); if (controller.current === request) controller.current = null }
  }, [selection, surah, source])
  const visible = selection?.surah === surah && selection.source === source && selection.source === currentSource() ? selection : null
  const shown = visible && result?.serial === visible.serial ? result : null
  return {
    tafsirFor: visible?.ayah ?? null,
    tafsirText: shown?.text ?? null,
    tafsirError: shown?.error ?? false,
    tafsirLoading: visible ? shown?.loading ?? true : false,
    tafsirLabel: sources[visible?.source ?? source].label,
    openTafsir, closeTafsir,
  }
}
