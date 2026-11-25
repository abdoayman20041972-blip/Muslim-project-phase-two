import { useEffect,useMemo,useState } from 'react'
import { shareQuoteCard } from './shareActions'
import type { ZikrCategory } from '../../../azkar-data'
import { BackButton } from '../../components/app-chrome'
import { useConfirmDialog } from '../../components/confirm-dialog'
import { favoriteKey, legacyFavoriteKey } from './useFavorites'
import { toArabicDigits, toArabicNumber } from '../../constants'
import { TasbihPad } from './TasbihPad'
import { APP_SETTINGS_KEYS,emitSettingsChanged,readSetting,writeSetting } from '../../settings'
import { AZKAR_PROGRESS_KEY, completedItemCount, completionPercent, readAzkarProgress, saveAzkarProgress, todayKey, migrateLegacyProgress, isCountedZikr, countedItems, isOccasionalCategory, readOccasionProgress, resetOccasionProgress, saveOccasionProgress } from './azkarProgress'
import { clearJourneyPosition } from './journeyPosition'
import { AzkarJourney } from './AzkarJourney'
import { parseReference } from './zikrReference'

type Props = { category: ZikrCategory; favorites: string[]; onToggleFavorite: (key: string) => void; onBack: () => void; highlightItem?: string }

const ZIKR_FONT_SIZES = { s: 17, m: 19, l: 22 } as const
// Scale applied through --zikr-scale; the stylesheet rules for the list and journey cards use it (they set font-size with !important, so an inline px size never reached the screen).
export const ZIKR_FONT_SCALE = { s: 0.9, m: 1, l: 1.15 } as const
type ZikrFontSize = keyof typeof ZIKR_FONT_SIZES
const ZIKR_FONT_ORDER: ZikrFontSize[] = ['s', 'm', 'l']
function readZikrFontSize(): ZikrFontSize {
  const stored = readSetting(APP_SETTINGS_KEYS.azkarFontSize, 'm')
  return stored === 's' || stored === 'l' ? stored : 'm'
}
type Filter = 'all' | 'incomplete' | 'complete' | 'favorites'

function StarIcon({ filled = false }: { filled?: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
}


function ShareIcon() {
  return <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.7"/><circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="19" r="2.3" stroke="currentColor" strokeWidth="1.7"/><path d="m8 11 7.7-4.5M8 13l7.7 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}

const filterLabelsFor = (occasional: boolean): Record<Filter, string> => ({ all: 'الكل', incomplete: occasional ? 'غير المكتمل' : 'غير المكتمل اليوم', complete: 'المكتمل', favorites: 'المفضلة' })
const fadlOnlyFilters: Filter[] = ['all', 'favorites']

function CornerOrnament() {
  return <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-20 w-20 overflow-hidden opacity-45">
    <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full border border-azkar-teal/30" />
    <div className="absolute right-1 top-1 h-11 w-11 rounded-full border border-azkar-gold/25" />
    <div className="absolute right-2 top-9 h-px w-12 rotate-45 bg-azkar-teal/20" />
    <div className="absolute right-9 top-2 h-12 w-px rotate-45 bg-azkar-teal/20" />
  </div>
}

export function CategoryView({ category, favorites, onToggleFavorite, onBack, highlightItem }: Props) {
  const { confirm } = useConfirmDialog()
  const occasional = isOccasionalCategory(category.id)
  const filterLabels = filterLabelsFor(occasional)
  // Initialize from storage so the first paint shows saved progress (no zero flash).
  const [progress, setProgress] = useState<Record<string,number>>(() => {
    if (typeof localStorage === 'undefined') return {}
    return occasional ? { ...readOccasionProgress(category.id).counts } : readAzkarProgress()
  })
  const [occasion, setOccasion] = useState(1)
  const [day, setDay] = useState(todayKey())
  const [dayChanged, setDayChanged] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [mode, setMode] = useState<'list' | 'journey'>('list')
  const [counterEnabled, setCounterEnabled] = useState(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'1') === '1')
  const [zikrFontSize, setZikrFontSize] = useState<ZikrFontSize>(readZikrFontSize)
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null)
  const cycleZikrFontSize = (direction: 1 | -1) => {
    const index = ZIKR_FONT_ORDER.indexOf(zikrFontSize)
    const next = ZIKR_FONT_ORDER[Math.min(ZIKR_FONT_ORDER.length - 1, Math.max(0, index + direction))]
    if (next === zikrFontSize) return
    setZikrFontSize(next)
    writeSetting(APP_SETTINGS_KEYS.azkarFontSize, next)
    emitSettingsChanged()
  }

  const loadCurrentDay = () => {
    const currentDay = todayKey()
    setDay(currentDay)
    if (occasional) {
      // Situational sections count per occasion, not per day, and stay out of the day log.
      const state = readOccasionProgress(category.id)
      setOccasion(state.occasion)
      setProgress({ ...state.counts })
      return
    }
    try {
      migrateLegacyProgress()
      const stored = JSON.parse(localStorage.getItem(AZKAR_PROGRESS_KEY) || '{}') as { days?: Record<string, Record<string,number>> }
      const current = stored.days?.[currentDay]
      if (!current) { setProgress({}); return }
      // Keep every stored key for the day: progress from other categories must survive opening this one.
      const migratedCurrent: Record<string, number> = { ...current }
      for (const item of category.items) {
        const nextKey = favoriteKey(category, item)
        const oldKey = legacyFavoriteKey(category, item)
        if (typeof migratedCurrent[nextKey] !== 'number' && typeof current[oldKey] === 'number') migratedCurrent[nextKey] = current[oldKey]
        if (nextKey !== oldKey) delete migratedCurrent[oldKey]
      }
      setProgress(migratedCurrent)
      if (JSON.stringify(migratedCurrent) !== JSON.stringify(current)) saveAzkarProgress(migratedCurrent, new Date())
    } catch { setProgress({}) }
  }

  useEffect(() => {
    loadCurrentDay()
    setCounterEnabled(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
    setAutoAdvanceEnabled(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'1') === '1')
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
    if (occasional) saveOccasionProgress(category.id, { occasion, counts: next })
    else saveAzkarProgress(next, new Date())
    window.dispatchEvent(new Event('azkar-progress-changed'))
  }

  useEffect(() => {
    const refreshSettings = () => {
      setCounterEnabled(readSetting(APP_SETTINGS_KEYS.azkarCounterEnabled,'1') !== '0')
      setAutoAdvanceEnabled(readSetting(APP_SETTINGS_KEYS.journeyAutoAdvance,'1') === '1')
      setZikrFontSize(readZikrFontSize())
    }
    window.addEventListener('azkar-settings-changed', refreshSettings)
    return () => window.removeEventListener('azkar-settings-changed', refreshSettings)
  }, [])

  useEffect(() => {
    if (!highlightItem) return
    setFilter('all')
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector(`[data-item-id="${CSS.escape(highlightItem)}"]`)
      if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' })
      setHighlightedItem(highlightItem)
    })
    return () => cancelAnimationFrame(frame)
  }, [highlightItem, category.id])

  useEffect(() => {
    if (!highlightedItem) return
    const timer = window.setTimeout(() => setHighlightedItem(null), 3500)
    return () => window.clearTimeout(timer)
  }, [highlightedItem])

  const totalItems = category.items.length
  const itemKeys = category.items.map(item => favoriteKey(category, item))
  const countedCategoryItems = countedItems(category.items)
  const countedKeys = countedCategoryItems.map(item => favoriteKey(category, item))
  const completedItems = completedItemCount(countedCategoryItems, countedKeys, progress)
  const countedTotal = countedCategoryItems.length
  const completionPct = completionPercent(completedItems, countedTotal)
  const sectionComplete = completedItems === countedTotal && countedTotal > 0
  const visibleItems = useMemo(() => category.items.filter(item => {
    const key = favoriteKey(category, item)
    if (filter === 'favorites') return favorites.includes(key)
    if (!isCountedZikr(item)) return filter === 'all'
    const target = Math.max(1, Number(item.repeat || 1))
    const current = Math.min(Number(progress[key] || 0), target)
    const completed = current >= target
    if (filter === 'incomplete') return !completed
    if (filter === 'complete') return completed
    return true
  }), [category.items, category.id, progress, filter, favorites])
  const resetToday = async () => {
    if (occasional) {
      if (!(await confirm({ message: 'بدء موقف جديد؟ يُصفَّر عدّاد هذا القسم فقط.', danger: true }))) return
      const nextOccasion = resetOccasionProgress(category.id)
      clearJourneyPosition(category.id)
      setOccasion(nextOccasion.occasion)
      setProgress({})
      window.dispatchEvent(new Event('azkar-progress-changed'))
      return
    }
    if (!(await confirm({ message: 'مسح تقدم أذكار هذا القسم اليوم؟', danger: true }))) return
    // The confirmation promises to clear this section only, so remove just this category's keys.
    const next = { ...progress }
    for (const item of category.items) {
      delete next[favoriteKey(category, item)]
      delete next[legacyFavoriteKey(category, item)]
    }
    clearJourneyPosition(category.id)
    saveProgress(next)
  }
  if (mode === 'journey') return <AzkarJourney category={category} progress={progress} counterEnabled={counterEnabled} autoAdvanceEnabled={autoAdvanceEnabled} fontScale={ZIKR_FONT_SCALE[zikrFontSize]} onProgressChange={saveProgress} onExit={() => setMode('list')} />

  return <div className="azkar-category-redesign">
    <div className="azkar-category-header flex items-center gap-3 mb-2"><BackButton onClick={onBack}/><div className="flex-1"><div className="font-amiri font-bold text-2xl text-azkar-teal-ink">{category.label}</div><div className="text-[0.6875rem] text-azkar-ink-faint mt-0.5">{category.subtitle}</div></div><div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="حجم خط الذكر"><button data-sound="none" onClick={() => cycleZikrFontSize(-1)} disabled={zikrFontSize === 's'} aria-label="تصغير خط الذكر" className="u-pressable flex h-9 w-9 items-center justify-center rounded-full border border-azkar-hairline bg-azkar-card text-[0.8125rem] font-bold text-azkar-ink-soft disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">أ-</button><button data-sound="none" onClick={() => cycleZikrFontSize(1)} disabled={zikrFontSize === 'l'} aria-label="تكبير خط الذكر" className="u-pressable flex h-9 w-9 items-center justify-center rounded-full border border-azkar-hairline bg-azkar-card text-[0.9375rem] font-bold text-azkar-ink-soft disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">أ+</button></div></div>
    {totalItems > 0 && <button data-sound="none" onClick={() => setMode('journey')} aria-label="بدء رحلة الأذكار المتسلسلة" className="u-pressable mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-azkar-teal/20 bg-azkar-teal-tint px-4 text-[0.75rem] font-bold text-azkar-teal-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"><span aria-hidden="true">▶</span><span>ابدأ الرحلة</span></button>}

    {dayChanged && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-azkar-teal/15 bg-azkar-teal-tint px-3.5 py-2.5 text-[0.6875rem] text-azkar-teal-ink"><span>بدأ يوم جديد — تم عرض تقدم اليوم الجديد.</span><button onClick={() => setDayChanged(false)} className="font-bold underline underline-offset-2">إخفاء</button></div>}

    {counterEnabled && countedTotal > 0 && <div className="mt-4 mb-4 rounded-[var(--r-lg)] border border-azkar-teal/15 bg-azkar-card p-4 u-shadow-1" aria-label={occasional ? 'تقدم أذكار الموقف الحالي' : 'تقدم أذكار القسم اليوم'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.75rem] font-bold text-azkar-ink">{occasional ? 'تقدم الموقف الحالي' : 'تقدم اليوم'}</div>
          <div className="mt-0.5 text-[0.6875rem] text-azkar-ink-faint">{sectionComplete ? (occasional ? 'أكملت أذكار هذا الموقف' : 'أكملت أذكار هذا القسم اليوم') : (occasional ? 'عدّاد لكل موقف ولا يُمسح يوميًا' : 'إكمال كل ذكر بالعدد المحدد يكمل القسم')}</div>
        </div>
        <div className="text-left" dir="rtl">
          <div className="text-[1rem] font-bold text-azkar-teal-ink" aria-label={`${toArabicNumber(completedItems)} من ${toArabicNumber(countedTotal)} أذكار مكتملة`}>{toArabicNumber(completedItems)} <span className="text-[0.6875rem] text-azkar-ink-faint">/ {toArabicNumber(countedTotal)}</span></div>
          <div className="text-[0.6875rem] text-azkar-ink-faint">{toArabicNumber(completionPct)}٪ مكتمل</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPct} aria-label={`إكمال ${completionPct} بالمائة من القسم`}>
        <div className={`h-full rounded-full transition-all duration-300 ${sectionComplete ? 'bg-azkar-gold' : 'bg-azkar-teal'}`} style={{ width: `${completionPct}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[0.6875rem] text-azkar-ink-faint">{toArabicNumber(countedTotal - completedItems)} متبقي</span>
        <button onClick={resetToday} className={occasional ? "rounded-xl border border-azkar-teal/25 bg-azkar-teal-tint px-3 py-2 text-[0.6875rem] font-bold text-azkar-teal-ink" : "rounded-xl border border-red-200 px-3 py-2 text-[0.6875rem] font-bold text-red-600"}>{occasional ? 'موقف جديد' : 'مسح تقدم اليوم'}</button>
      </div>
    </div>}

    <div className="azkar-category-filters mt-4 overflow-x-auto pb-1" role="group" aria-label="تصفية الأذكار"><div className="flex min-w-max gap-2">{(countedTotal > 0 ? (Object.keys(filterLabels) as Filter[]) : fadlOnlyFilters).map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={"rounded-full border px-3 py-2 text-[0.6875rem] font-bold transition " + (filter === value ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-hairline bg-azkar-card text-azkar-ink-soft')}>{filterLabels[value]}</button>)}</div></div>

    <div className="azkar-list-cards mt-3 flex flex-col gap-4">
      {visibleItems.length === 0 ? <div className="px-5 py-10 text-center"><div className="font-amiri text-[1.125rem] font-bold text-azkar-ink">لا توجد أذكار في هذا العرض</div><div className="mt-1 text-[0.6875rem] text-azkar-ink-faint">جرّب فلترًا آخر أو أضف أذكارًا إلى المفضلة.</div></div> : visibleItems.map((item) => {
        const key = favoriteKey(category, item)
        const saved = favorites.includes(key)
        const counted = isCountedZikr(item)
        const kindLabel = item.kind === 'fadl' ? 'فضل وخبر' : item.kind === 'guidance' ? 'إرشاد وآداب' : undefined
        const target = Math.max(1, Number(item.repeat || 1))
        const current = Math.min(Number(progress[key] || 0), target)
        const completed = current >= target
        const parsedSource = item.source ? parseReference(item.source) : undefined
        const displaySource = parsedSource && !parsedSource.ignored ? parsedSource.value : undefined
        const increment = (event: { currentTarget: HTMLButtonElement }) => {
          if (completed) return
          const next = current + 1
          // Completion tap gets the completion sound; ordinary taps keep the tap sound.
          // The tap-sound listener also fires the completion vibration, honoring settings.
          event.currentTarget.dataset.sound = next >= target ? 'tasbih-complete' : 'tasbih'
          saveProgress({...progress,[key]:next})
        }
        const decrement = () => {
          if (current <= 0) return
          saveProgress({...progress,[key]:current-1})
        }
        const isHighlighted = highlightedItem === item.id
        return <article key={key} data-item-id={item.id} data-highlighted={isHighlighted ? 'true' : undefined} className={"relative overflow-hidden px-4 py-3 sm:px-5 sm:py-4 transition-colors duration-500 " + (item.kind === 'fadl' ? "azkar-fadl-card " : item.kind === 'guidance' ? "azkar-guidance-card " : "") + (isHighlighted ? "bg-azkar-gold-tint/60 ring-2 ring-inset ring-azkar-gold/70" : "")}>
          <CornerOrnament />

          <div className="relative mb-1 flex items-center justify-between gap-3">
            {counted && item.repeat ? <span className="rounded-full border border-azkar-teal/15 bg-azkar-teal-tint px-2.5 py-1 text-[0.6875rem] font-bold text-azkar-teal-ink">الهدف {toArabicNumber(item.repeat)} مرة</span> : kindLabel ? <span className={"rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold " + (item.kind === 'fadl' ? 'border-azkar-gold/30 bg-azkar-gold-tint text-azkar-gold' : 'border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-faint')}>{kindLabel}</span> : <span />}
            <button data-sound="none" onClick={() => onToggleFavorite(key)} aria-label={saved ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'} className={`u-pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${saved ? 'border-azkar-gold/30 bg-azkar-gold-tint text-azkar-gold' : 'border-azkar-hairline bg-azkar-surface-1 text-azkar-ink-faint'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal`}>
              <StarIcon filled={saved}/>
            </button>
          </div>

          <p className="relative u-reading-text text-[1.1875rem] leading-[2] text-azkar-ink whitespace-pre-line" style={{ ['--zikr-scale' as string]: ZIKR_FONT_SCALE[zikrFontSize] }}>{toArabicDigits(item.text)}</p>

          {counterEnabled && counted && <TasbihPad variant="list" current={current} target={target} onTap={increment} onUndo={decrement} />}

          <div className="relative mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {displaySource && <p className="text-[0.6875rem] text-azkar-ink-faint">{toArabicDigits(displaySource)}</p>}
            {item.reference?.grade && <span className="rounded-full border border-azkar-hairline bg-azkar-surface-1 px-2 py-0.5 text-[0.6875rem] font-bold text-azkar-ink-soft">{item.reference.grade}</span>}
            {item.reference?.url && <a href={item.reference.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[2.5rem] items-center px-1 text-[0.6875rem] font-bold text-azkar-teal underline underline-offset-2">المصدر</a>}
            </div>
            <button onClick={() => void shareQuoteCard({ text: toArabicDigits(item.text), reference: displaySource ? toArabicDigits(displaySource) : undefined, heading: category.label, filename: 'zikr.png' })} aria-label="مشاركة الذكر" className="u-pressable inline-flex h-8 items-center gap-2 rounded-full border border-azkar-hairline bg-azkar-surface-1 px-3 text-[0.6875rem] font-bold text-azkar-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">
              <ShareIcon />
              <span>مشاركة</span>
            </button>
          </div>
        </article>
      })}
    </div>
  </div>
}
