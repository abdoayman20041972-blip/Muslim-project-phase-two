import { useEffect,useMemo,useState } from 'react'
import { copyText, shareText } from './shareActions'
import type { ZikrCategory } from '../../../azkar-data'
import { BackButton } from '../../components/app-chrome'
import { useConfirmDialog } from '../../components/confirm-dialog'
import { favoriteKey, legacyFavoriteKey } from './useFavorites'
import { toArabicDigits, toArabicNumber } from '../../constants'
import { APP_SETTINGS_KEYS,readSetting } from '../../settings'
import { AZKAR_PROGRESS_KEY, completedItemCount, completionPercent, saveAzkarProgress, todayKey, migrateLegacyProgress } from './azkarProgress'
import { AzkarJourney } from './AzkarJourney'
import { parseReference } from './zikrReference'

type Props = { category: ZikrCategory; favorites: string[]; onToggleFavorite: (key: string) => void; onBack: () => void }
type Filter = 'all' | 'incomplete' | 'complete' | 'favorites'

function StarIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.7"/></svg>
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.7"/><circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="19" r="2.3" stroke="currentColor" strokeWidth="1.7"/><path d="m8 11 7.7-4.5M8 13l7.7 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}

const filterLabels: Record<Filter, string> = { all: 'الكل', incomplete: 'غير المكتمل اليوم', complete: 'المكتمل', favorites: 'المفضلة' }

function CornerOrnament() {
  return <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-20 w-20 overflow-hidden opacity-45">
    <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full border border-azkar-teal/30" />
    <div className="absolute right-1 top-1 h-11 w-11 rounded-full border border-azkar-gold/25" />
    <div className="absolute right-2 top-9 h-px w-12 rotate-45 bg-azkar-teal/20" />
    <div className="absolute right-9 top-2 h-12 w-px rotate-45 bg-azkar-teal/20" />
  </div>
}

export function CategoryView({ category, favorites, onToggleFavorite, onBack }: Props) {
  const { confirm } = useConfirmDialog()
  const [progress, setProgress] = useState<Record<string,number>>({})
  const [day, setDay] = useState(todayKey())
  const [dayChanged, setDayChanged] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [mode, setMode] = useState<'list' | 'journey'>('list')
  const [counterEnabled, setCounterEnabled] = useState(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'0') === '1')

  const loadCurrentDay = () => {
    const currentDay = todayKey()
    setDay(currentDay)
    try {
      migrateLegacyProgress()
      const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: Record<string, Record<string,number>> }
      const current = stored.days?.[currentDay]
      if (!current) { setProgress({}); return }
      const migratedCurrent: Record<string, number> = {}
      for (const item of category.items) {
        const nextKey = favoriteKey(category, item)
        const oldKey = legacyFavoriteKey(category, item)
        if (typeof current[nextKey] === 'number') migratedCurrent[nextKey] = current[nextKey]
        else if (typeof current[oldKey] === 'number') migratedCurrent[nextKey] = current[oldKey]
      }
      setProgress(migratedCurrent)
      if (JSON.stringify(migratedCurrent) !== JSON.stringify(current)) saveAzkarProgress(migratedCurrent, new Date())
    } catch { setProgress({}) }
  }

  useEffect(() => {
    loadCurrentDay()
    setCounterEnabled(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
    setAutoAdvanceEnabled(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'0') === '1')
    setFilter('all')
    setMode('list')
  }, [category.id])

  useEffect(() => {
    const refreshDay = () => {
      const currentDay = todayKey()
      if (currentDay !== day) {
        setDayChanged(true)
        loadCurrentDay()
        setFilter('all')
      }
    }
    const timer = window.setInterval(refreshDay, 60_000)
    window.addEventListener('focus', refreshDay)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDay)
    }
  }, [day])

  const saveProgress = (next: Record<string,number>) => {
    setProgress(next)
    saveAzkarProgress(next, new Date())
    window.dispatchEvent(new Event('azkar-progress-changed'))
  }

  useEffect(() => {
    const refreshSettings = () => {
      setCounterEnabled(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
      setAutoAdvanceEnabled(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'0') === '1')
    }
    window.addEventListener('azkar-settings-changed', refreshSettings)
    return () => window.removeEventListener('azkar-settings-changed', refreshSettings)
  }, [])

  const totalItems = category.items.length
  const itemKeys = category.items.map(item => favoriteKey(category, item))
  const completedItems = completedItemCount(category.items, itemKeys, progress)
  const completionPct = completionPercent(completedItems, totalItems)
  const sectionComplete = completedItems === totalItems && totalItems > 0
  const visibleItems = useMemo(() => category.items.filter(item => {
    const key = favoriteKey(category, item)
    const target = Math.max(1, Number(item.repeat || 1))
    const current = Math.min(Number(progress[key] || 0), target)
    const completed = current >= target
    if (filter === 'incomplete') return !completed
    if (filter === 'complete') return completed
    if (filter === 'favorites') return favorites.includes(key)
    return true
  }), [category.items, category.id, progress, filter, favorites])
  const resetToday = async () => { if (!(await confirm({ message: 'مسح تقدم أذكار هذا القسم اليوم؟', danger: true }))) return; saveProgress({}) }
  if (mode === 'journey') return <AzkarJourney category={category} progress={progress} counterEnabled={counterEnabled} autoAdvanceEnabled={autoAdvanceEnabled} onProgressChange={saveProgress} onExit={() => setMode('list')} />

  return <div className="azkar-category-redesign animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="azkar-category-header flex items-center gap-3 mb-2"><BackButton onClick={onBack}/><div className="flex-1"><div className="font-amiri font-bold text-2xl text-azkar-teal-ink">{category.label}</div><div className="text-[11px] text-azkar-ink-faint mt-0.5">{category.subtitle}</div></div></div>
    {totalItems > 0 && <button data-sound="none" onClick={() => setMode('journey')} aria-label="بدء رحلة الأذكار المتسلسلة" className="u-pressable mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-azkar-teal/20 bg-azkar-teal-tint px-4 text-[12px] font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"><span aria-hidden="true">▶</span><span>ابدأ الرحلة</span></button>}

    {dayChanged && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-azkar-teal/15 bg-azkar-teal-tint px-3.5 py-2.5 text-[10px] text-azkar-teal-ink"><span>بدأ يوم جديد — تم عرض تقدم اليوم الجديد.</span><button onClick={() => setDayChanged(false)} className="font-bold underline underline-offset-2">إخفاء</button></div>}

    {counterEnabled && <div className="mt-4 mb-4 rounded-[var(--r-lg)] border border-azkar-teal/15 bg-azkar-card p-4 u-shadow-1" aria-label="تقدم أذكار القسم اليوم">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-bold text-azkar-ink">تقدم اليوم</div>
          <div className="mt-0.5 text-[10px] text-azkar-ink-faint">{sectionComplete ? 'أكملت أذكار هذا القسم اليوم' : 'إكمال كل ذكر بالعدد المحدد يكمل القسم'}</div>
        </div>
        <div className="text-left" dir="rtl">
          <div className="text-[16px] font-bold text-azkar-teal-ink" aria-label={`${toArabicNumber(completedItems)} من ${toArabicNumber(totalItems)} أذكار مكتملة`}>{toArabicNumber(completedItems)} <span className="text-[10px] text-azkar-ink-faint">/ {toArabicNumber(totalItems)}</span></div>
          <div className="text-[9px] text-azkar-ink-faint">{toArabicNumber(completionPct)}٪ مكتمل</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPct} aria-label={`إكمال ${completionPct} بالمائة من القسم`}>
        <div className={`h-full rounded-full transition-all duration-300 ${sectionComplete ? 'bg-azkar-gold' : 'bg-azkar-teal'}`} style={{ width: `${completionPct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[9px] text-azkar-ink-faint">{toArabicNumber(totalItems - completedItems)} متبقي</span>
        <button onClick={resetToday} className="rounded-xl border border-red-200 px-3 py-2 text-[10px] font-bold text-red-600">مسح تقدم اليوم</button>
      </div>
    </div>}

    <div className="azkar-category-filters mt-4 overflow-x-auto pb-1" role="group" aria-label="تصفية الأذكار"><div className="flex min-w-max gap-2">{(Object.keys(filterLabels) as Filter[]).map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={"rounded-full border px-3 py-2 text-[10px] font-bold transition " + (filter === value ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-hairline bg-azkar-card text-azkar-ink-soft')}>{filterLabels[value]}</button>)}</div></div>

    <div className="azkar-list-cards mt-3 divide-y divide-azkar-hairline overflow-hidden rounded-[var(--r-lg)] border border-azkar-hairline bg-azkar-card u-shadow-1">
      {visibleItems.length === 0 ? <div className="px-5 py-10 text-center"><div className="font-amiri text-[18px] font-bold text-azkar-ink">لا توجد أذكار في هذا العرض</div><div className="mt-1 text-[10px] text-azkar-ink-faint">جرّب فلترًا آخر أو أضف أذكارًا إلى المفضلة.</div></div> : visibleItems.map((item) => {
        const key = favoriteKey(category, item)
        const saved = favorites.includes(key)
        const target = Math.max(1, Number(item.repeat || 1))
        const current = Math.min(Number(progress[key] || 0), target)
        const completed = current >= target
        const parsedSource = item.source ? parseReference(item.source) : undefined
        const displaySource = parsedSource && !parsedSource.ignored ? parsedSource.value : undefined
        const increment = () => {
          if (completed) return
          saveProgress({...progress,[key]:current+1})
        }
        return <article key={key} className="relative overflow-hidden px-4 py-5 sm:px-5 sm:py-6">
          <CornerOrnament />

          <div className="relative mb-4 flex items-center justify-between gap-3">
            {item.repeat ? <span className="rounded-full border border-azkar-teal/15 bg-azkar-teal-tint px-2.5 py-1 text-[10.5px] font-bold text-azkar-teal-ink">الهدف {toArabicNumber(item.repeat)} مرة</span> : <span />}
            <button data-sound="none" onClick={() => onToggleFavorite(key)} aria-label={saved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} className={`u-pressable flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${saved ? 'border-azkar-gold/30 bg-azkar-gold-tint text-azkar-gold' : 'border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-faint'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal`}>
              <StarIcon filled={saved}/>
            </button>
          </div>

          <p className="relative u-reading-text text-[19px] leading-[2] text-azkar-ink whitespace-pre-line">{toArabicDigits(item.text)}</p>

          {counterEnabled && <div className="relative mt-5 rounded-2xl border border-azkar-hairline bg-azkar-surface-1 p-2.5"><div className="mb-2 flex items-center justify-between px-1"><span className="text-[9px] text-azkar-ink-faint">التقدم</span><span className="text-[12px] font-bold text-azkar-teal-ink">{toArabicNumber(current)} <span className="text-[9px] text-azkar-ink-faint">من {toArabicNumber(target)}</span></span></div><div className="mb-2 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current} aria-label={"تقدم الذكر: " + current + " من " + target}><div className={"h-full rounded-full transition-all duration-200 " + (completed ? 'bg-azkar-gold' : 'bg-azkar-teal')} style={{ width: Math.min(100, current / target * 100) + '%' }} /></div><div className="flex items-center gap-3"><button data-sound="tasbih" onClick={increment} disabled={completed} aria-label={completed ? 'تم إكمال الذكر' : 'تسجيل مرة من الذكر'} className={"u-pressable flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-[12px] font-bold transition " + (completed ? 'bg-azkar-teal text-azkar-card' : 'bg-azkar-teal-tint text-azkar-teal-ink hover:bg-azkar-teal/20') + ' disabled:cursor-default'}><span className="text-base">{completed ? '✓' : '＋'}</span><span>{completed ? 'تم الإكمال' : 'اضغط للتسجيل'}</span></button><div className="min-w-[68px] text-center"><div className="text-[9px] text-azkar-ink-faint">المتبقي</div><div className="text-[13px] font-bold text-azkar-ink">{toArabicNumber(target-current)}</div></div></div></div>}

          {displaySource && <p className="relative mt-4 text-[10.5px] text-azkar-ink-faint">{toArabicDigits(displaySource)}</p>}

          <div className="relative mt-5 flex items-center gap-2 border-t border-azkar-hairline pt-4">
            <button onClick={() => void copyText(item.text)} aria-label="نسخ الذكر" className="u-pressable inline-flex h-9 items-center gap-2 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[11px] font-bold text-azkar-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">
              <CopyIcon />
              <span>نسخ</span>
            </button>
            <button onClick={() => void shareText(item.text, { title: category.label, source: displaySource })} aria-label="مشاركة الذكر" className="u-pressable inline-flex h-9 items-center gap-2 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[11px] font-bold text-azkar-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">
              <ShareIcon />
              <span>مشاركة</span>
            </button>
          </div>
        </article>
      })}
    </div>
  </div>
}
