import { useEffect, useState } from 'react'
import { APP_SETTINGS_KEYS, readSetting } from '../../settings'
import { useQuranAudio } from './QuranAudioProvider'
import { surahList } from '../../../quran-meta'
import { QURAN_AUDIO_RECITER_LABELS, type QuranAudioReciter } from './quranAudioPlayback'
import { ReciterPicker } from './ReciterPicker'

function useMiniPlayerHidden() {
  const [hidden, setHidden] = useState(() => readSetting(APP_SETTINGS_KEYS.hideMiniPlayer, '0') === '1')
  useEffect(() => {
    const sync = () => setHidden(readSetting(APP_SETTINGS_KEYS.hideMiniPlayer, '0') === '1')
    window.addEventListener('azkar-settings-changed', sync)
    return () => window.removeEventListener('azkar-settings-changed', sync)
  }, [])
  return hidden
}

export function QuranMiniPlayer() {
  const hidden = useMiniPlayerHidden()
  const { reciter, current, currentSurah, playing, toggleCurrent, stop, playback, setReciter, buffering, source, error, retry, saved, restore, backgroundWarning, audioProgress } = useQuranAudio()

  if (currentSurah === null) return saved ? <div dir="rtl" className="fixed bottom-24 left-3 right-3 z-[55] rounded-2xl border border-azkar-hairline bg-azkar-card p-3 text-sm text-azkar-teal-ink shadow-lg" data-testid="quran-resume-player">
    <button type="button" onClick={restore} className="u-pressable rounded-xl bg-azkar-teal px-3 py-2 text-azkar-card">استئناف الاستماع</button>
    <span className="mx-2">{surahList.find((item) => item.number === saved.surah)?.shortName} · {QURAN_AUDIO_RECITER_LABELS[saved.reciter]} · {Math.floor(saved.seconds / 60)}:{String(Math.floor(saved.seconds % 60)).padStart(2, '0')}</span>
    <button type="button" onClick={() => stop()} aria-label="مسح موضع الاستماع المحفوظ">مسح</button>
  </div> : null

  // The user can hide the floating player; playback and the system notification are unaffected.
  // The separate "resume listening" bar above stays as it was.
  if (hidden) return null

  const reciterLabel = QURAN_AUDIO_RECITER_LABELS[reciter as QuranAudioReciter] ?? reciter
  const surah = surahList.find((item) => item.number === currentSurah)

  const togglePlayback = () => {
    toggleCurrent()
  }

  return (
    <div dir="rtl" data-testid="quran-mini-player"
      className="quran-mini-player fixed z-[55] flex w-[min(94vw,520px)] max-w-md items-center gap-2 rounded-2xl border border-azkar-hairline bg-azkar-card/98 px-3 py-2.5 text-azkar-ink shadow-[0_10px_28px_hsl(var(--azkar-ink)/0.18)] backdrop-blur-lg"
      aria-label="مشغل القرآن المصغر"
    >
      <div className="min-w-0 flex-1 select-none">
        <div className="truncate text-sm font-bold text-azkar-teal-ink">{surah?.shortName ?? 'القرآن الكريم'}</div>
        <div className="mt-0.5 truncate text-xs text-azkar-ink-soft">
          {source === 'offline' ? 'أوفلاين · ' : ''}{reciterLabel} · {playback?.kind === 'connected' ? 'تلاوة متصلة' : current !== null ? 'الآية ' + current : 'تلاوة القرآن'}
        </div>
      </div>
      {(error || backgroundWarning) && <div role="alert" className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-azkar-hairline bg-azkar-card p-3 text-xs text-azkar-ink shadow-lg">
        {error || backgroundWarning} {error && <button type="button" onClick={retry} className="mr-2 underline">إعادة المحاولة</button>}
      </div>}
      <span className="sr-only" aria-live="polite">{buffering ? 'جاري تحميل الصوت' : playing ? 'قيد التشغيل' : 'متوقف مؤقتًا'} {Math.floor((audioProgress || 0) / 60)} دقيقة</span>
      <ReciterPicker label="القارئ في المشغل المصغر" value={reciter} onChange={(next) => { void setReciter(next) }}
        className="h-9 w-[7.5rem] shrink-0 text-[0.6875rem]" />
      <button type="button" onClick={togglePlayback}
        className="u-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azkar-teal text-azkar-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold"
        aria-busy={buffering} aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
        {playing ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5Z" /></svg>}
      </button>
      <button type="button" onClick={stop}
        className="u-pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-azkar-bg-alt text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold"
        aria-label="إغلاق مشغل القرآن المصغر">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}
