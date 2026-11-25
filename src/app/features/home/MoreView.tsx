import { useEffect, useState } from 'react'
import { setMoreBackHandler } from './moreNav'
import { Pause, Play, Radio } from 'lucide-react'
import { RadioView } from '../radio/RadioView'
import { useRadio } from '../radio/RadioProvider'

/** The "More" tab: sections that don't have a place on Home. Radio is the first. */
export function MoreView() {
  const [screen, setScreen] = useState<'list' | 'radio'>('list')
  const { station, status, toggle } = useRadio()
  const live = status === 'playing' || status === 'loading'
  useEffect(() => {
    if (screen !== 'radio') return
    setMoreBackHandler(() => { setScreen('list'); return true })
    return () => setMoreBackHandler(null)
  }, [screen])

  if (screen === 'radio') return <RadioView onBack={() => setScreen('list')} />

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
    </div>
  )
}
