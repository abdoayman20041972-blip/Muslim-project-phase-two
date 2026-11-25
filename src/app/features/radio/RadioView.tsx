import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Pause, Play, Radio, RefreshCw, Search, Square } from 'lucide-react'
import { useRadio } from './RadioProvider'
import { loadStations, orderedStations, type RadioGroup, type RadioStation } from './radioData'

const GROUPS: Array<{ id: RadioGroup; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'reciters', label: 'القرّاء' },
  { id: 'mixed', label: 'تلاوات متنوعة' },
  { id: 'seerah', label: 'السيرة والقصص' },
  { id: 'tafsir', label: 'التفسير' },
  { id: 'hadith', label: 'الحديث' },
  { id: 'adhkar', label: 'أذكار ورقية' },
  { id: 'fatwa', label: 'فتاوى وفقه' },
  { id: 'occasions', label: 'مناسبات' },
]

export function useRadioStations() {
  const [stations, setStations] = useState<RadioStation[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [offlineCopy, setOfflineCopy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setState('loading')
    loadStations().then((result) => {
      if (!alive) return
      setStations(result.stations); setOfflineCopy(result.offlineCopy); setState('ready')
    }).catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [attempt])
  return { stations, state, offlineCopy, retry: () => setAttempt((n) => n + 1) }
}

function statusLabel(status: string) {
  if (status === 'loading') return 'جارٍ الاتصال بالبث…'
  if (status === 'playing') return 'بث مباشر الآن'
  if (status === 'paused') return 'متوقفة مؤقتًا'
  if (status === 'error') return 'تعذر تشغيل هذه المحطة الآن'
  return 'اختر محطة لتبدأ'
}

function StationRow({ station, current, status, onPlay }: { station: RadioStation; current: boolean; status: string; onPlay: () => void }) {
  const playing = current && (status === 'playing' || status === 'loading')
  return (
    <button type="button" onClick={onPlay} data-testid="radio-station" aria-label={`${playing ? 'إيقاف مؤقت' : 'تشغيل'} ${station.name}`}
      className={`u-pressable flex w-full items-center gap-3 border-b border-azkar-hairline px-4 py-3 text-right last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold ${current ? 'bg-azkar-gold-tint' : ''}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${current ? 'bg-azkar-teal text-azkar-card' : 'bg-azkar-bg-alt text-azkar-teal-ink'}`} aria-hidden="true">
        {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-bold text-azkar-teal-ink">{station.name}</span>
        {current && <span className="block text-[0.75rem] font-semibold text-azkar-ink-soft">{statusLabel(status)}</span>}
      </span>
    </button>
  )
}

export function RadioView({ onBack }: { onBack: () => void }) {
  const { station, status, play, toggle, stop, notificationWarning } = useRadio()
  const { stations, state, offlineCopy, retry } = useRadioStations()
  const [group, setGroup] = useState<RadioGroup>('all')
  const [query, setQuery] = useState('')
  const { featured, learn, rest } = useMemo(() => orderedStations(stations, group, query), [stations, group, query])
  const live = status === 'playing' || status === 'loading'

  return (
    <section dir="rtl" className="w-full min-w-0" data-testid="radio-view">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="رجوع" className="u-pressable flex h-10 w-10 items-center justify-center rounded-full border border-azkar-hairline bg-azkar-card text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="font-amiri text-[1.75rem] font-bold text-azkar-teal-ink">إذاعة القرآن الكريم</h1>
      </div>

      <div className="radio-hero mt-5" data-testid="radio-hero">
        <svg className="radio-hero-waves" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M-10 70 C60 5 110 135 190 70 S320 5 410 60" fill="none" stroke="#e9c875" strokeWidth="3" strokeOpacity=".55" />
          <path d="M-10 140 C70 75 130 195 215 135 S330 80 410 130" fill="none" stroke="#e9c875" strokeWidth="2.5" strokeOpacity=".4" />
        </svg>
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className={`radio-live ${live ? 'is-live' : ''}`}><i aria-hidden="true" />{live ? 'مباشر' : 'بث مباشر'}</span>
            <p className="mt-2 truncate font-amiri text-[1.5rem] font-bold leading-tight text-white" data-testid="radio-now">{station ? station.name : 'لا توجد محطة قيد التشغيل'}</p>
            <p className="mt-1 text-[0.8125rem] font-semibold text-white/80" role="status">{statusLabel(status)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {station && (
              <button type="button" onClick={stop} aria-label="إيقاف الإذاعة" className="u-pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold">
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            )}
            <button type="button" disabled={!station} onClick={toggle} aria-label={live ? 'إيقاف مؤقت' : 'تشغيل'}
              className="u-pressable flex h-14 w-14 items-center justify-center rounded-full bg-[#e9c875] text-[#123329] shadow-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {live ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
            </button>
          </div>
        </div>
        {status === 'error' && station && (
          <button type="button" onClick={() => play(station)} className="u-pressable relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-bold text-white">
            <RefreshCw className="h-3.5 w-3.5" />إعادة المحاولة
          </button>
        )}
      </div>
      {notificationWarning && <p role="alert" className="mt-3 text-[0.8125rem] font-semibold text-azkar-ink-soft">{notificationWarning}</p>}

      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-azkar-hairline bg-azkar-card px-4 py-2.5 focus-within:ring-2 focus-within:ring-azkar-gold">
        <Search className="h-4 w-4 shrink-0 text-azkar-ink-soft" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قارئ أو محطة" aria-label="ابحث عن محطة"
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-azkar-ink outline-none placeholder:text-azkar-ink-soft" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="تصنيف المحطات">
        {GROUPS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={group === item.id} onClick={() => setGroup(item.id)}
            className={`u-pressable rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold ${group === item.id ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-hairline bg-azkar-card text-azkar-teal-ink'}`}>
            {item.label}
          </button>
        ))}
      </div>

      {state === 'loading' && <p role="status" className="mt-6 text-center text-[0.875rem] font-semibold text-azkar-ink-soft">جارٍ تحميل المحطات…</p>}
      {state === 'error' && (
        <div role="alert" className="mt-6 rounded-2xl border border-azkar-hairline bg-azkar-card p-4 text-center">
          <p className="text-[0.875rem] font-semibold text-azkar-ink-soft">تعذر تحميل قائمة المحطات. تحقق من الإنترنت ثم أعد المحاولة.</p>
          <button type="button" onClick={retry} className="u-pressable mt-3 rounded-xl bg-azkar-teal px-4 py-2 text-[0.875rem] font-bold text-azkar-card">إعادة المحاولة</button>
        </div>
      )}
      {state === 'ready' && offlineCopy && <p className="mt-4 text-[0.75rem] font-semibold text-azkar-ink-soft">القائمة محفوظة من آخر مرة، والبث يحتاج إنترنت.</p>}
      {state === 'ready' && featured.length > 0 && (
        <>
          <h2 className="mt-5 px-1 text-[0.8125rem] font-bold text-azkar-ink-soft">قرّاء مختارون</h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-azkar-hairline bg-azkar-card u-shadow-2">
            {featured.map((s) => <StationRow key={s.id} station={s} current={station?.id === s.id} status={status} onPlay={() => (station?.id === s.id ? toggle() : play(s))} />)}
          </div>
        </>
      )}
      {state === 'ready' && learn.length > 0 && (
        <>
          <h2 className="mt-5 px-1 text-[0.8125rem] font-bold text-azkar-ink-soft">سيرة وتفسير وحديث</h2>
          <div className="mt-2 overflow-hidden rounded-2xl border border-azkar-hairline bg-azkar-card u-shadow-2">
            {learn.map((s) => <StationRow key={s.id} station={s} current={station?.id === s.id} status={status} onPlay={() => (station?.id === s.id ? toggle() : play(s))} />)}
          </div>
        </>
      )}
      {state === 'ready' && rest.length > 0 && (
        <>
          {(featured.length > 0 || learn.length > 0) && <h2 className="mt-5 px-1 text-[0.8125rem] font-bold text-azkar-ink-soft">كل المحطات</h2>}
          <div className={`${featured.length > 0 || learn.length > 0 ? 'mt-2' : 'mt-5'} overflow-hidden rounded-2xl border border-azkar-hairline bg-azkar-card u-shadow-2`}>
            {rest.map((s) => <StationRow key={s.id} station={s} current={station?.id === s.id} status={status} onPlay={() => (station?.id === s.id ? toggle() : play(s))} />)}
          </div>
        </>
      )}
      {state === 'ready' && featured.length === 0 && learn.length === 0 && rest.length === 0 && <p className="mt-6 text-center text-[0.875rem] font-semibold text-azkar-ink-soft">لا توجد محطات مطابقة.</p>}
      <p className="mt-6 text-center text-[0.6875rem] font-semibold text-azkar-ink-soft">مصدر البث: MP3Quran</p>
    </section>
  )
}

export function RadioCardIcon() { return <Radio className="h-6 w-6" /> }
