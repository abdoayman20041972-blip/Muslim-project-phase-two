import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useQuranAudio } from './QuranAudioProvider'
import { surahList } from '../../../quran-meta'
import { QURAN_AUDIO_RECITER_LABELS, QURAN_AUDIO_RECITERS, type QuranAudioReciter } from './quranAudioPlayback'

type Position = { x: number | null; y: number }

export function QuranMiniPlayer() {
  const { reciter, current, currentSurah, playing, toggleCurrent, stop, playback, setReciter } = useQuranAudio()
  const [position, setPosition] = useState<Position>({ x: null, y: 16 })
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  if (currentSurah === null) return null

  const reciterLabel = QURAN_AUDIO_RECITER_LABELS[reciter as QuranAudioReciter] ?? reciter
  const surah = surahList.find((item) => item.number === currentSurah)

  const togglePlayback = () => {
    toggleCurrent()
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button,select,option,a,input')) return
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top }
    if (typeof event.currentTarget.setPointerCapture === 'function') event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.style.cursor = 'grabbing'
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const rect = event.currentTarget.getBoundingClientRect()
    const maxX = Math.max(8, window.innerWidth - rect.width - 8)
    const maxY = Math.max(8, window.innerHeight - rect.height - 8)
    setPosition({
      x: Math.min(maxX, Math.max(8, event.clientX - drag.offsetX)),
      y: Math.min(maxY, Math.max(8, event.clientY - drag.offsetY)),
    })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    event.currentTarget.style.cursor = 'grab'
  }

  const style = position.x === null
    ? { top: position.y + 'px', left: '50%', transform: 'translateX(-50%)' }
    : { top: position.y + 'px', left: position.x + 'px' }

  return (
    <div dir="rtl" data-testid="quran-mini-player"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      style={style}
      className="fixed z-[55] flex w-[min(94vw,520px)] max-w-md items-center gap-2 rounded-2xl border border-azkar-hairline bg-azkar-card/98 px-3 py-2.5 text-azkar-ink shadow-[0_10px_28px_hsl(var(--azkar-ink)/0.18)] backdrop-blur-lg"
      aria-label="مشغل القرآن المصغر"
    >
      <div className="min-w-0 flex-1 cursor-grab select-none touch-none" title="اسحب لتحريك المشغل">
        <div className="truncate text-sm font-bold text-azkar-teal-ink">{surah?.shortName ?? 'القرآن الكريم'}</div>
        <div className="mt-0.5 truncate text-xs text-azkar-ink-soft">
          {reciterLabel} · {playback?.kind === 'connected' ? 'تلاوة متصلة' : current !== null ? 'الآية ' + current : 'تلاوة القرآن'}
        </div>
      </div>
      <select aria-label="القارئ في المشغل المصغر" value={reciter}
        onChange={(event) => { void setReciter(event.target.value as QuranAudioReciter) }}
        onPointerDown={(event) => event.stopPropagation()}
        className="h-9 max-w-[125px] shrink-0 rounded-xl border border-azkar-gold-soft bg-azkar-bg-alt px-2 text-[10px] font-bold text-azkar-teal-ink">
        {QURAN_AUDIO_RECITERS.map((id) => <option key={id} value={id}>{QURAN_AUDIO_RECITER_LABELS[id]}</option>)}
      </select>
      <button type="button" onClick={togglePlayback}
        className="u-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azkar-teal text-azkar-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold"
        aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}>
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
