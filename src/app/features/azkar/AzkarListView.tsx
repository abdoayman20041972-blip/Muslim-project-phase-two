import { useMemo, useState, type CSSProperties } from 'react'
import { arabicCount, CATEGORY_COUNT_FORMS, toArabicNumber, ZIKR_COUNT_FORMS } from '../../constants'
import type { ZikrCategory } from '../../../azkar-data'
import { BackButton, CategoryIcon } from '../../components/app-chrome'
import type { View } from '../../constants'
import { AZKAR_PROGRESS_RETENTION_DAYS, completedItemCount, completionPercent, readAzkarProgress, readAzkarProgressDays, timeBasedAzkar } from './azkarProgress'
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
  const keys = category.items.map(item => favoriteKey(category, item))
  const completed = completedItemCount(category.items, keys, progress)
  return { completed, total: category.items.length, percent: completionPercent(completed, category.items.length) }
}

export function AzkarListView({ categories, favoritesCount, onBack, setView }: Props) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const currentWird = timeBasedAzkar()
  const progress = readAzkarProgress()
  const morning = categories.find(category => category.id === 'morning')
  const evening = categories.find(category => category.id === 'evening')
  const otherCategories = categories.filter(category => category.id !== 'morning' && category.id !== 'evening')
  const allItems = useMemo(() => categories.flatMap(category => category.items), [categories])
  const allKeys = useMemo(() => categories.flatMap(category => category.items.map(item => favoriteKey(category, item))), [categories])
  const completedToday = completedItemCount(allItems, allKeys, progress)
  const todayPercent = completionPercent(completedToday, allItems.length)
  const currentCategory = categories.find(category => category.id === currentWird.id)
  const history = useMemo(() => Object.entries(readAzkarProgressDays()).sort(([a], [b]) => b.localeCompare(a)).slice(0, AZKAR_PROGRESS_RETENTION_DAYS), [])
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ar')
    if (!query) return []
    return categories
      .flatMap(category => category.items.map(item => ({ category, item })))
      .filter(({ item }) => item.text.toLocaleLowerCase().includes(query))
      .slice(0, 12)
  }, [categories, search])

  const openCategory = (category?: ZikrCategory) => {
    if (category) setView({ name: 'category', id: category.id })
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
          <div className="font-amiri text-[19px] font-bold leading-tight">{category.label}</div>
          <div className="mt-1 text-[10px] opacity-75">{arabicCount(stats.total, ZIKR_COUNT_FORMS)}</div>
        </div>
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[9px] opacity-80">
            <span>{toArabicNumber(stats.completed)} / {toArabicNumber(stats.total)}</span>
            <span>{toArabicNumber(stats.percent)}٪</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${stats.percent}%` }} />
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="azkar-home-v2 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-5">
      <section className="azkar-home-v2-hero relative overflow-hidden rounded-b-[2.25rem] px-1 pb-5 pt-1">
        <div className="azkar-home-v2-arch" aria-hidden="true">
          <span className="azkar-home-v2-mosque" />
        </div>

        <header className="relative flex items-center gap-3 px-2 pt-1">
          <BackButton onClick={onBack} />
          <div className="min-w-0 flex-1 text-center">
            <div className="font-amiri text-[29px] font-bold leading-none text-azkar-teal-ink">الأذكار</div>
            <div className="mt-1 font-amiri text-[12px] text-azkar-ink-soft">واذكر ربك إذا نسيت</div>
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
          <div className="relative mt-4 px-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="rounded-2xl border border-azkar-gold-soft bg-azkar-card/95 p-2 shadow-lg backdrop-blur">
              <input
                autoFocus
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ابحث في نص الذكر..."
                aria-label="ابحث عن ذكر"
                className="h-11 w-full rounded-xl bg-azkar-surface-1 px-3 text-[12px] text-azkar-ink outline-none focus:ring-2 focus:ring-azkar-teal/20"
              />
              {search.trim() && (
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
                  {searchResults.length === 0
                    ? <div className="py-4 text-center text-[10px] text-azkar-ink-faint">لا توجد نتائج مطابقة.</div>
                    : searchResults.map(({ category, item }) => (
                      <button key={`${category.id}:${item.id ?? item.text}`} type="button" aria-label={`فتح ${category.label}: ${item.text}`} onClick={() => openCategory(category)} className="u-pressable flex w-full items-center gap-2 rounded-xl bg-azkar-surface-1 px-3 py-2.5 text-right">
                        <span className="min-w-0 flex-1 truncate text-[11px] text-azkar-ink">{item.text}</span>
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
              <div className="font-amiri text-[20px] font-bold text-azkar-ink">إنجازك اليوم</div>
              <div className="mt-1 font-amiri text-[16px] text-azkar-teal-ink">{toArabicNumber(completedToday)} ذكرًا مكتملًا</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-azkar-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={allItems.length} aria-valuenow={completedToday} aria-label={`تقدم الأذكار اليوم: ${completedToday} من ${allItems.length}`}> 
                <div className="h-full rounded-full bg-azkar-teal transition-all duration-500" style={{ width: `${todayPercent}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-azkar-hairline pt-2 text-center text-[9px] text-azkar-ink-faint">
            {arabicCount(allItems.length, ZIKR_COUNT_FORMS)} في مجموعتك اليومية
          </div>
        </section>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 px-1" aria-label="أذكار الصباح والمساء">
        {currentWird.id === 'morning'
          ? <>{renderPrimaryCard(morning, 'morning')}{renderPrimaryCard(evening, 'evening')}</>
          : <>{renderPrimaryCard(evening, 'evening')}{renderPrimaryCard(morning, 'morning')}</>}
      </section>

      <section className="mt-6 px-1">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-amiri text-[20px] font-bold text-azkar-ink">الفئات الأخرى</h2>
          <span className="text-[9px] text-azkar-ink-faint">{arabicCount(otherCategories.length, CATEGORY_COUNT_FORMS)}</span>
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
                <div className="relative mt-3 font-amiri text-[16px] font-bold leading-tight text-azkar-ink">{category.label}</div>
                <div className="relative mt-1 text-[9px] text-azkar-ink-faint">{arabicCount(stats.total, ZIKR_COUNT_FORMS)}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-6 px-1" aria-label="وصول سريع">
        <h2 className="mb-3 font-amiri text-[20px] font-bold text-azkar-ink">وصول سريع</h2>
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
    <div className="sr-only">
      <button type="button" aria-expanded={historyOpen} aria-controls="azkar-progress-history-legacy" onClick={() => setHistoryOpen(open => !open)}>سجل الأيام</button>
      {historyOpen && <div id="azkar-progress-history-legacy" role="region" aria-label="سجل الأيام">
        {history.length === 0 ? <span>لا يوجد سجل سابق بعد</span> : history.map(([dateKey, dayProgress]) => {
          const completed = completedItemCount(allItems, allKeys, dayProgress)
          const percent = completionPercent(completed, allItems.length)
          const [year, month, day] = dateKey.split("-").map(Number)
          const label = year && month && day ? new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day)) : dateKey
          return <div key={dateKey}><span>{label}</span> <span>{toArabicNumber(percent)}٪</span> <span>{toArabicNumber(completed)} مكتمل من {toArabicNumber(allItems.length)}</span></div>
        })}
      </div>}
      <span>الأذكار المفضلة</span>
    </div>
    </div>
  )
}
