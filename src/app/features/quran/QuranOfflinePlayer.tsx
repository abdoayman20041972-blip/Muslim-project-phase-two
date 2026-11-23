import { useEffect, useState } from 'react'
import { isSurahDownloaded } from './offlineDownload'
import type { QuranAudioReciter } from './quranAudioPlayback'

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
  return <div data-testid="quran-offline-player" className="mb-3 rounded-2xl border border-azkar-teal-soft bg-azkar-card p-3 text-xs text-azkar-teal-ink">
    نسخة منزّلة متاحة. تشغيل السورة يستخدمها تلقائيًا إن كانت قابلة للتشغيل، من بداية السورة.
  </div>
}
