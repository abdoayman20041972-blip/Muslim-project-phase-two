import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { arabicCount, CATEGORY_COUNT_FORMS, toArabicNumber, ZIKR_COUNT_FORMS } from '../../constants'
import type { ZikrCategory } from '../../../azkar-data'
import { BackButton, CategoryIcon } from '../../components/app-chrome'
import type { View } from '../../constants'
import { AZKAR_PROGRESS_RETENTION_DAYS, completedItemCount, completionPercent, countedItems, readAzkarProgress, readAzkarProgressDays, wirdForPrayerTimes } from './azkarProgress'
import { usePrayerCoords, usePrayerTimings } from '../prayer/prayerTimes'
import { favoriteKey } from './useFavorites'

type Props = {
  categories: ZikrCategory[]
  favoritesCount: number
  onBack: () => void
  setView: (view: View) => void
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.4" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

function StarIcon() {
  return <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="currentColor" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/></svg>
}

function JourneyIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><path d="M5 18.5c2.8-4.8 5.1-8 8.2-9.9 1.9-1.1 3.7-1.1 5.8.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="m16.2 6.7 2.9 2.1-3.1 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="18.5" r="2" fill="currentColor"/><circle cx="19" cy="8.8" r="2" fill="currentColor"/></svg>
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.2" stroke="currentColor" strokeWidth="1.6"/><path d="M9 8h6M9 12h6M9 16h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}

const MORNING_IMAGE = '/img/azkar-morning-wide-mosque.jpg'
const EVENING_IMAGE = '/img/azkar-evening-wide-sunset-mosque.jpg'

function PrimaryIllustration({ tone }: { tone: 'morning' | 'evening' }) {
  return <img src={tone === 'morning' ? MORNING_IMAGE : EVENING_IMAGE} alt="" className="azkar-primary-illustration" aria-hidden="true" loading="eager" decoding="async" />
}

function categoryStats(category: ZikrCategory, progress: Record<string, number>) {
  const counted = countedItems(category.items)
  const keys = counted.map(item => favoriteKey(category, item))
  const completed = completedItemCount(counted, keys, progress)
  return { completed, total: category.items.length, countedTotal: counted.length, percent: completionPercent(completed, counted.length) }
}

export function AzkarListView({ categories, favoritesCount, onBack, setView }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  // «وردك الآن» follows the computed prayer times when they load; until then
  // (or without location) it falls back to the fixed-hour windows.
  const prayerCoords = usePrayerCoords()
  const { timings: todayTimings } = usePrayerTimings(prayerCoords)
  const currentWird = wirdForPrayerTimes(todayTimings)
  const [progress, setProgress] = useState<Record<string, number>>(() => readAzkarProgress())
  useEffect(() => {
    const refresh = () => setProgress(readAzkarProgress())
    window.addEventListener('azkar-progress-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('azkar-progress-changed', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  const morning = categories.find(category => category.id === 'morning')
  const evening = categories.find(category => category.id === 'evening')
  const otherCategories = categories.filter(category => category.id !== 'morning' && category.id !== 'evening')
  // The realistic daily goal is the two timed wirds only; on-demand and situational
  // sections are recited when needed and stay out of the daily goal and the day log.
  const wirdCategories = useMemo(() => [morning, evening].filter((category): category is ZikrCategory => Boolean(category)), [morning, evening])
  const wirdItems = useMemo(() => wirdCategories.flatMap(category => countedItems(category.items)), [wirdCategories])
  const wirdKeys = useMemo(() => wirdCategories.flatMap(category => countedItems(category.items).map(item => favoriteKey(category, item))), [wirdCategories])
  const wirdProgress = wirdCategories.map(category => {
    const counted = countedItems(category.items)
    const keys = counted.map(item => favoriteKey(category, item))
    const completed = completedItemCount(counted, keys, progress)
    return { category, completed, total: counted.length, percent: completionPercent(completed, counted.length) }
  })
  const completedToday = completedItemCount(wirdItems, wirdKeys, progress)
  const todayPercent = completionPercent(completedToday, wirdItems.length)
  const currentCategory = categories.find(category => category.id === currentWird.id)
  const history = useMemo(() => Object.entries(readAzkarProgressDays()).sort(([a], [b]) => b.localeCompare(a)).slice(0, AZKAR_PROGRESS_RETENTION_DAYS), [progress])
  const searchResults = useMemo(() => {
    // Users type without tashkeel: match on stripped text so a plain query
    // still reaches the voweled dhikr itself.
    const strip = (value: string) => value.toLocaleLowerCase('ar').replace(/[\u0640\u064B-\u0652\u0670]/g, '')
    const query = strip(search.trim())
    if (!query) return []
    return categories
      .flatMap(category => category.items.map(item => ({ category, item })))
      .filter(({ item }) => strip(item.text).includes(query))
      .slice(0, 12)
  }, [categories, search])

  const openCategory = (category?: ZikrCategory, itemId?: string) => {
    if (!category) return
    setView(itemId ? { name: 'category', id: category.id, item: itemId } : { name: 'category', id: category.id })
  }

  const renderPrimaryCard = (category: ZikrCategory | undefined, tone: 'morning' | 'evening') => {
    if (!category) return null
    const stats = categoryStats(category, progress)
    return (
      <button
        type="button"
        onClick={() => openCategory(category)}
        aria-label={category.label}
        className={`azkar-primary-card azkar-primary-card-${tone} u-pressable group relative min-w-0 overflow-hidden rounded-[1.35rem] border p-4 text-right u-shadow-1 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:u-shadow-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal`}
      >
        <span className="azkar-primary-glow" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-2">
          <span className="azkar-primary-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <CategoryIcon icon={tone === 'morning' ? 'sun' : 'moon'} />
          </span>
          <ChevronIcon />
        </div>
        <div className="azkar-primary-illustration-wrap" aria-hidden="true">
          <PrimaryIllustration tone={tone} />
        </div>
        <div className="relative mt-1">
          <div className="font-amiri text-[1.1875rem] font-bold leading-tight">{category.label}</div>
          <div className="mt-1 text-[0.6875rem] opacity-75">{arabicCount(stats.total, ZIKR_COUNT_FORMS)}</div>
        </div>
        {stats.countedTotal > 0 && <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[0.6875rem] opacity-80">
            <span>{toArabicNumber(stats.completed)} / {toArabicNumber(stats.countedTotal)}</span>
            <span>{toArabicNumber(stats.percent)}٪</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${stats.percent}%` }} />
          </div>
        </div>}
      </button>
    )
  }

  return (
    <div className="azkar-home-v2 pb-5">
      <section className="azkar-home-v2-hero relative overflow-hidden rounded-b-[2.25rem] px-1 pb-5 pt-1">
        <div className="azkar-home-v2-arch" aria-hidden="true">
          <span className="azkar-home-v2-mosque" />
        </div>

        <header className="relative flex items-center gap-3 px-2 pt-1">
          <BackButton onClick={onBack} />
          <div className="min-w-0 flex-1 text-center">
            <div className="font-amiri text-[1.8125rem] font-bold leading-none text-azkar-teal-ink">الأذكار</div>
            <div className="mt-1 font-amiri text-[0.75rem] text-azkar-ink-soft">واذكر ربك إذا نسيت</div>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(open => !open)}
            aria-label="البحث في الأذكار"
            aria-expanded={searchOpen}
            className="u-pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-azkar-gold-soft bg-azkar-card/90 text-azkar-teal-ink shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-gold"
          >
            <SearchIcon />
          </button>
        </header>

        {searchOpen && (
          <div className="relative mt-4 px-2">
            <div className="rounded-2xl border border-azkar-gold-soft bg-azkar-card/95 p-2 shadow-lg backdrop-blur">
              <input
                autoFocus
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ابحث في نص الذكر..."
                aria-label="ابحث عن ذكر"
                className="h-11 w-full rounded-xl bg-azkar-surface-1 px-3 text-[0.75rem] text-azkar-ink outline-none focus:ring-2 focus:ring-azkar-teal/20"
              />
              {search.trim() && (
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                  {searchResults.length === 0
                    ? <div className="py-4 text-center text-[0.6875rem] text-azkar-ink-faint">لا توجد نتائج مطابقة.</div>
                    : searchResults.map(({ category, item }) => (
                      <button key={`${category.id}:${item.id ?? item.text}`} type="button" aria-label={`فتح ${category.label}: ${item.text}`} onClick={() => openCategory(category, item.id)} className="u-pressable flex w-full items-center gap-2 rounded-xl bg-azkar-surface-1 px-3 py-2.5 text-right">
                        <span className="min-w-0 flex-1 truncate text-[0.6875rem] text-azkar-ink">{item.text}</span>
                        <ChevronIcon />
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <section className="azkar-daily-card relative mt-5 mx-1 overflow-hidden rounded-[1.45rem] border p-4" aria-label="ملخص اليوم">
          <div className="flex items-center gap-4">
            <div className="azkar-daily-ring" style={{ '--progress': `${todayPercent * 3.6}deg` } as CSSProperties}>
              <span>{toArabicNumber(todayPercent)}٪</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-amiri text-[1.25rem] font-bold text-azkar-ink">إنجازك اليوم</div>
              <div className="mt-1 font-amiri text-[1rem] text-azkar-teal-ink">{toArabicNumber(completedToday)} ذكرًا مكتملًا من الوردين</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={wirdItems.length} aria-valuenow={completedToday} aria-label={`تقدم الأذكار اليوم: ${completedToday} من ${wirdItems.length}`}>
                <div className="h-full rounded-full bg-azkar-teal transition-all duration-500" style={{ width: `${todayPercent}%` }} />
              </div>
            </div>
          </div>
          {wirdProgress.length > 0 && <div className="mt-3 space-y-2 border-t border-azkar-hairline pt-3" aria-label="أهداف الوردين">
            {wirdProgress.map(({ category, completed, total, percent }) => (
              <div key={category.id} className="flex items-center justify-between gap-3 text-[0.6875rem]">
                <span className="font-bold text-azkar-teal-ink">{category.label}</span>
                <span className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed} aria-label={`تقدم ${category.label}: ${completed} من ${total}`}>
                    <span className="block h-full rounded-full bg-azkar-teal" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="shrink-0 font-bold text-azkar-teal-ink">{toArabicNumber(completed)} / {toArabicNumber(total)}</span>
                </span>
              </div>
            ))}
          </div>}
        </section>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 px-1" aria-label="أذكار الصباح والمساء">
        {currentWird.id === 'morning'
          ? <>{renderPrimaryCard(morning, 'morning')}{renderPrimaryCard(evening, 'evening')}</>
          : <>{renderPrimaryCard(evening, 'evening')}{renderPrimaryCard(morning, 'morning')}</>}
      </section>

      <section className="mt-6 px-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-amiri text-[1.25rem] font-bold text-azkar-ink">الفئات الأخرى</h2>
          <span className="text-[0.6875rem] text-azkar-ink-faint">{arabicCount(otherCategories.length, CATEGORY_COUNT_FORMS)}</span>
        </div>
        <div className="azkar-category-grid-v2 grid grid-cols-2 gap-2.5">
          {otherCategories.map(category => {
            const stats = categoryStats(category, progress)
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => openCategory(category)}
                aria-label={category.label}
                className="azkar-category-card-v2 u-pressable group relative min-h-[7.3rem] overflow-hidden rounded-2xl border p-3 text-right transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:u-shadow-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal"
              >
                <span className="azkar-category-card-orb" aria-hidden="true" />
                <div className="relative flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-azkar-teal-tint text-azkar-teal-ink"><CategoryIcon icon={category.icon} /></span>
                  <ChevronIcon />
                </div>
                <div className="relative mt-3 font-amiri text-[1rem] font-bold leading-tight text-azkar-ink">{category.label}</div>
                <div className="relative mt-1 text-[0.6875rem] text-azkar-ink-faint">{arabicCount(stats.total, ZIKR_COUNT_FORMS)}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6 px-1" aria-label="وصول سريع">
        <h2 className="mb-3 font-amiri text-[1.25rem] font-bold text-azkar-ink">وصول سريع</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <button type="button" onClick={() => setView({ name: 'favorites' })} className="azkar-quick-card azkar-quick-gold u-pressable">
            <span className="azkar-quick-icon"><StarIcon /></span>
            <span>المفضلة</span>
            <small>{toArabicNumber(favoritesCount)} محفوظ</small>
          </button>
          <button type="button" onClick={() => currentCategory && setView({ name: 'category', id: currentCategory.id })} className="azkar-quick-card azkar-quick-teal u-pressable">
            <span className="azkar-quick-icon"><JourneyIcon /></span>
            <span>رحلة الأذكار</span>
            <small>ابدأ وردك</small>
          </button>
          <button type="button" aria-label={currentCategory ? `فتح ${currentCategory.label}` : "آخر ما قرأت"} onClick={() => currentCategory && setView({ name: 'category', id: currentCategory.id })} className="azkar-quick-card azkar-quick-cream u-pressable">
            <span className="azkar-quick-icon"><HistoryIcon /></span>
            <span><span className="sr-only">وردك الآن</span>آخر ما قرأت</span>
            <small>{currentCategory?.label ?? 'لا يوجد'}</small>
          </button>
        </div>
      </section>
      <section className="mt-6 px-1" aria-label="سجل الأيام">
        <div className="overflow-hidden rounded-2xl border border-azkar-hairline bg-azkar-card u-shadow-1">
          <button type="button" aria-expanded={historyOpen} aria-controls="azkar-days-log" onClick={() => setHistoryOpen(open => !open)} className="u-pressable flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azkar-teal">
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-azkar-teal-tint text-azkar-teal-ink"><HistoryIcon /></span>
              <span>
                <span className="block font-amiri text-[1rem] font-bold text-azkar-ink">سجل الأيام</span>
                <span className="mt-0.5 block text-[0.6875rem] text-azkar-ink-faint">إنجازك في الأيام السابقة</span>
              </span>
            </span>
            <span className={"text-azkar-ink-faint transition-transform duration-200 " + (historyOpen ? "rotate-90" : "")}><ChevronIcon /></span>
          </button>
          {historyOpen && <div id="azkar-days-log" className="border-t border-azkar-hairline px-4 py-1.5">
            {history.length === 0
              ? <div className="py-5 text-center text-[0.6875rem] text-azkar-ink-faint">لا يوجد سجل سابق بعد</div>
              : history.slice(0, 14).map(([dateKey, dayProgress]) => {
                const completed = completedItemCount(wirdItems, wirdKeys, dayProgress)
                const percent = completionPercent(completed, wirdItems.length)
                const [year, month, day] = dateKey.split("-").map(Number)
                const label = year && month && day ? new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day)) : dateKey
                return <div key={dateKey} className="flex items-center justify-between gap-3 border-b border-azkar-hairline py-2.5 last:border-0">
                  <span className="text-[0.6875rem] text-azkar-ink">{label}</span>
                  <span className="shrink-0 text-[0.6875rem] font-bold text-azkar-teal-ink">{toArabicNumber(completed)} / {toArabicNumber(wirdItems.length)} · {toArabicNumber(percent)}٪</span>
                </div>
              })}
          </div>}
        </div>
      </section>
    </div>
  )
}
