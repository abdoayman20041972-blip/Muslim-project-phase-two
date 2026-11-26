import { useEffect, useState } from 'react'
import { setMoreBackHandler } from './moreNav'
import { Pause, Play, Radio, Video } from 'lucide-react'
import { HaramLiveView } from '../haram/HaramLiveView'
import { LibraryView } from '../library/LibraryView'
import { BookCover } from '../library/BookCover'
import { LIBRARY_BOOKS } from '../library/libraryData'
import { RadioView } from '../radio/RadioView'
import { useRadio } from '../radio/RadioProvider'
import { BookOpen } from 'lucide-react'
import { EssentialsView } from '../essentials/EssentialsView'

/** The "More" tab: sections that don't have a place on Home. Radio is the first. */
export function MoreView() {
  const [screen, setScreen] = useState<'list' | 'radio' | 'library' | 'haram' | 'essentials'>('list')
  const { station, status, toggle } = useRadio()
  const live = status === 'playing' || status === 'loading'
  useEffect(() => {
    if (screen === 'list') return
    setMoreBackHandler(() => { setScreen('list'); return true })
    return () => setMoreBackHandler(null)
  }, [screen])

  if (screen === 'radio') return <RadioView onBack={() => setScreen('list')} />
  if (screen === 'haram') return <HaramLiveView onBack={() => setScreen('list')} />
  if (screen === 'library') return <LibraryView onBack={() => setScreen('list')} />
  if (screen === 'essentials') return <EssentialsView onBack={() => setScreen('list')} />

  return (
    <div className="w-full min-w-0" data-testid="more-view">
      <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">المزيد</h1>
      <div className="more-radio-card mt-6" data-testid="more-radio-card">
        <svg className="radio-hero-waves" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-10 70 C60 5 110 135 190 70 S320 5 410 60" fill="none" stroke="#e9c875" strokeWidth="3" strokeOpacity=".55" />
          <path d="M-10 140 C70 75 130 195 215 135 S330 80 410 130" fill="none" stroke="#e9c875" strokeWidth="2.5" strokeOpacity=".4" />
        </svg>
        <button type="button" onClick={() => setScreen('radio')} aria-label="فتح إذاعة القرآن الكريم" className="u-pressable relative flex min-w-0 flex-1 items-center gap-3 text-right focus-visible:outline-none">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9c875]/25 text-[#f3dc9a]" aria-hidden="true"><Radio className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-amiri text-[1.375rem] font-bold leading-tight text-white">إذاعة القرآن الكريم</span>
            <span className="mt-0.5 block truncate text-[0.8125rem] font-semibold text-white/80">{station && status !== 'idle' ? station.name : 'بث مباشر على مدار الساعة'}</span>
          </span>
        </button>
        {station && status !== 'idle' ? (
          <button type="button" onClick={toggle} aria-label={live ? 'إيقاف مؤقت' : 'تشغيل'} className="u-pressable relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e9c875] text-[#123329] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            {live ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>
        ) : (
          <span className="radio-live relative"><i aria-hidden="true" />مباشر</span>
        )}
      </div>
      <button type="button" onClick={() => setScreen('haram')} aria-label="فتح البث المباشر" data-testid="more-haram-card" className="more-haram-card u-pressable mt-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e9c875]/25 text-[#f3dc9a]" aria-hidden="true"><Video className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1 text-right">
          <span className="block font-amiri text-[1.375rem] font-bold leading-tight text-white">البث المباشر بالفيديو</span>
          <span className="mt-0.5 block text-[0.8125rem] font-semibold text-white/80">قناتان بالصوت والصورة</span>
        </span>
        <span className="radio-live relative"><i aria-hidden="true" />مباشر</span>
      </button>
      <button type="button" onClick={() => setScreen('library')} aria-label="فتح مكتبة السيرة والتاريخ" data-testid="more-library-card" className="more-library-card u-pressable mt-4">
        <span className="more-library-books" aria-hidden="true">
          {LIBRARY_BOOKS.slice(0, 3).map((book, i) => <BookCover key={book.id} book={book} className={`more-library-book more-library-book-${i}`} />)}
        </span>
        <span className="min-w-0 flex-1 text-right">
          <span className="block font-amiri text-[1.375rem] font-bold leading-tight text-azkar-teal-ink">المكتبة</span>
          <span className="mt-0.5 block text-[0.8125rem] font-semibold text-azkar-ink-soft">السيرة والصحابة والتاريخ الإسلامي</span>
        </span>
      </button>
      <button type="button" onClick={() => setScreen('essentials')} aria-label="فتح ما لا يسع المسلم جهله" data-testid="more-essentials-card" className="more-library-card u-pressable mt-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-azkar-teal-tint text-azkar-teal-ink" aria-hidden="true"><BookOpen className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1 text-right">
            <span className="block font-amiri text-[1.375rem] font-bold leading-tight text-azkar-teal-ink">ما لا يسع المسلم جهله</span>
            <span className="mt-0.5 block text-[0.8125rem] font-semibold text-azkar-ink-soft">شرح مبسط لأساسيات الدين</span>
          </span>
      </button>
    </div>
  )
}
