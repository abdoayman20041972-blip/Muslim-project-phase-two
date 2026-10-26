import { useEffect, useState } from 'react'
import { stripBismillahPrefix, type Ayah } from '../../constants'
import { loadSurah } from './loadSurah'

export function useQuranReaderData(surahNumber: number) {
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setAyahs(null); setError(null); setLoading(true)
    loadSurah(surahNumber, controller.signal)
      .then(list => {
        if (cancelled) return
        if (surahNumber !== 1 && surahNumber !== 9 && list[0]) list[0] = { ...list[0], text: stripBismillahPrefix(list[0].text) }
        setAyahs(list)
      })
      .catch(err => {
        if (!cancelled) setError(err?.message === 'incomplete' ? 'بيانات السورة غير مكتملة، ولن يتم عرضها حفاظًا على سلامة النص.' : 'محتاج اتصال بالإنترنت أول مرة تفتح فيها هذه السورة')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [surahNumber])
  return { ayahs, loading, error }
}