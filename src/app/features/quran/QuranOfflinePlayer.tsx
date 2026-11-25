import { useEffect, useState } from 'react'
import { isSurahDownloaded } from './offlineDownload'
import { QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from './quranAudioPlayback'

type Props = { reciter: QuranAudioReciter; surahNumber: number }

/** Availability hint only. Audio belongs to the application-level provider. */
export function QuranOfflinePlayer({ reciter, surahNumber }: Props) {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    let current = true
    setAvailable(false)
    void isSurahDownloaded(reciter, surahNumber).then((value) => { if (current) setAvailable(value) }).catch(() => {})
    return () => { current = false }
  }, [reciter, surahNumber])
  if (!available) return null
  return <div data-testid="quran-offline-player" className="mb-3 inline-flex rounded-full border border-azkar-teal-soft bg-azkar-card px-3 py-1 text-xs font-bold text-azkar-teal-ink">
    منزّلة للاستماع بدون إنترنت · {QURAN_AUDIO_RECITER_LABELS[reciter]}
  </div>
}
