import { useCallback, useEffect, useRef, useState } from 'react'
import { surahList } from '../../../quran-meta'
import { getDownloadedSurahBlob, isSurahDownloaded } from './offlineDownload'
import type { QuranAudioReciter } from './quranAudioPlayback'

type Props = { reciter: QuranAudioReciter; surahNumber: number; autoStart: boolean; onAutoStartConsumed: () => void; onNavigateToSurah: (surahNumber: number) => void }

export function QuranOfflinePlayer({ reciter, surahNumber, autoStart, onAutoStartConsumed, onNavigateToSurah }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const loadRequestRef = useRef(0)
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src'); audioRef.current.load() }
    setActive(false)
  }, [])

  const loadAndPlay = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    setError(null); setLoading(true); releaseObjectUrl()
    // M1 fix: announce offline playback so the online player stops (no double audio).
    window.dispatchEvent(new CustomEvent('quran-offline-play'))
    try {
      const downloaded = await isSurahDownloaded(reciter, surahNumber)
      if (!downloaded) { if (requestId === loadRequestRef.current) setAvailable(false); return }
      const blob = await getDownloadedSurahBlob(reciter, surahNumber)
      if (!blob) { if (requestId === loadRequestRef.current) { setAvailable(false); setError('الملف الأوفلاين غير متاح.') }; return }
      const objectUrl = URL.createObjectURL(blob)
      if (requestId !== loadRequestRef.current) { URL.revokeObjectURL(objectUrl); return }
      objectUrlRef.current = objectUrl; setAvailable(true)
      const audio = audioRef.current
      if (!audio) return
      audio.src = objectUrl; audio.load(); await audio.play()
      if (requestId === loadRequestRef.current) setActive(true)
    } catch {
      if (requestId === loadRequestRef.current) { setError('تعذر تشغيل الملف الأوفلاين.'); setActive(false) }
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false)
    }
  }, [reciter, surahNumber, releaseObjectUrl])

  useEffect(() => {
    let cancelled = false
    void isSurahDownloaded(reciter, surahNumber).then((value) => { if (!cancelled) setAvailable(value) }).catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true; loadRequestRef.current += 1; releaseObjectUrl() }
  }, [reciter, surahNumber, releaseObjectUrl])

  useEffect(() => {
    if (!autoStart || !available) return
    onAutoStartConsumed(); void loadAndPlay()
  }, [autoStart, available, loadAndPlay, onAutoStartConsumed])

  // M1 fix: when online playback starts anywhere, stop the offline audio element.
  useEffect(() => {
    const handleOnlinePlay = () => releaseObjectUrl()
    window.addEventListener('quran-online-play', handleOnlinePlay)
    return () => window.removeEventListener('quran-online-play', handleOnlinePlay)
  }, [releaseObjectUrl])

  const handleEnded = async () => {
    setActive(false)
    if (surahNumber >= 114) { releaseObjectUrl(); return }
    const next = surahNumber + 1
    try { if (await isSurahDownloaded(reciter, next)) { releaseObjectUrl(); onNavigateToSurah(next) } else releaseObjectUrl() } catch { releaseObjectUrl() }
  }

  if (!available && !loading && !error) return null
  return (
    <div className="mb-3 rounded-[1.2rem] border border-azkar-teal-soft bg-azkar-card p-3" data-testid="quran-offline-player">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="font-amiri font-bold text-sm text-azkar-teal-ink">استماع أوفلاين</div><div className="mt-1 text-[10px] text-azkar-ink-soft">{surahList.find((item) => item.number === surahNumber)?.shortName || ('السورة ' + surahNumber)} · {active ? 'يعمل من الملف المخزّن' : 'ملف سورة كامل'}</div></div>
        <button type="button" onClick={() => void loadAndPlay()} disabled={loading} className="u-pressable shrink-0 rounded-xl bg-azkar-teal px-3 py-2 text-[10px] font-bold text-azkar-card disabled:opacity-50">{loading ? 'جاري الفتح…' : active ? 'تشغيل مرة أخرى' : 'استماع أوفلاين'}</button>
        {active && <button type="button" onClick={releaseObjectUrl} className="u-pressable shrink-0 rounded-xl border border-azkar-gold-soft px-3 py-2 text-[10px] font-bold text-azkar-teal-ink">إيقاف أوفلاين</button>}
      </div>
      {error && <div role="alert" className="mt-2 text-[10px] text-azkar-ink-soft">{error}</div>}
      <audio ref={audioRef} controls preload="metadata" onPlay={() => setActive(true)} onPause={() => setActive(false)} onEnded={() => void handleEnded()} className="mt-3 w-full" aria-label="مشغل الاستماع الأوفلاين" />
    </div>
  )
}